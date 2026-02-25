import type { LocalContext } from '../../../context';
import colors from 'colors';
import * as t from 'io-ts';
import { createReadStream } from 'node:fs';
import { parse as csvParse } from 'csv-parse';
import inquirer from 'inquirer';
import { PersistedState } from '@transcend-io/persisted-state';
import { logger } from '../../../logger';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit';
import { buildTranscendGraphQLClient } from '../../../lib/graphql';
import { loadReferenceData } from '../upload-preferences/upload/loadReferenceData';
import { computeSchemaFile } from '../upload-preferences/artifacts';
import {
  FileFormatState,
  parsePreferenceIdentifiersFromCsv,
  parsePreferenceFileFormatFromCsv,
  parsePreferenceAndPurposeValuesFromCsv,
} from '../../../lib/preference-management';
import { readCsv } from '../../../lib/requests';

export interface ConfigurePreferenceUploadFlags {
  auth: string;
  sombraAuth?: string;
  transcendUrl: string;
  directory: string;
  schemaFilePath?: string;
  partition: string;
}

/**
 * Scan all CSV files in a directory and collect the union of column headers
 * plus all unique values per non-identifier column. Uses streaming so large
 * files don't need to be held in memory.
 *
 * @param files - CSV file paths to scan
 * @returns headers and uniqueValuesByColumn
 */
async function scanCsvFiles(files: string[]): Promise<{
  /** Union of all column headers */
  headers: string[];
  /** Map of column name to its unique values (trimmed, non-empty) */
  uniqueValuesByColumn: Record<string, Set<string>>;
}> {
  const allHeaders = new Set<string>();
  const uniqueValuesByColumn: Record<string, Set<string>> = {};

  for (const file of files) {
    await new Promise<void>((resolve, reject) => {
      const parser = createReadStream(file).pipe(
        csvParse({ columns: true, skip_empty_lines: true }),
      );
      parser.on('data', (row: Record<string, string>) => {
        for (const [col, val] of Object.entries(row)) {
          allHeaders.add(col);
          if (!uniqueValuesByColumn[col]) {
            uniqueValuesByColumn[col] = new Set();
          }
          const trimmed = (val || '').trim();
          if (trimmed) {
            uniqueValuesByColumn[col].add(trimmed);
          }
        }
      });
      parser.on('end', resolve);
      parser.on('error', reject);
    });
  }

  return {
    headers: [...allHeaders],
    uniqueValuesByColumn,
  };
}

/**
 * Build synthetic preference rows from the scanned unique values so
 * the existing parse functions see every value at least once.
 *
 * @param headers - all column headers
 * @param uniqueValuesByColumn - unique values per column
 * @returns synthetic rows covering all unique values
 */
function buildSyntheticRows(
  headers: string[],
  uniqueValuesByColumn: Record<string, Set<string>>,
): Record<string, string>[] {
  const maxRows = Math.max(
    1,
    ...headers.map((h) => uniqueValuesByColumn[h]?.size ?? 0),
  );
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < maxRows; i += 1) {
    const row: Record<string, string> = {};
    for (const h of headers) {
      const vals = uniqueValuesByColumn[h]
        ? [...uniqueValuesByColumn[h]]
        : [''];
      row[h] = vals[i % vals.length] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Interactively configure the column mapping for preference CSV uploads.
 *
 * Scans ALL CSV files in a directory, discovers every header and unique value,
 * then walks the user through mapping identifiers, ignored columns, timestamps,
 * and purpose/preference value mappings. Saves the result as a reusable config.
 *
 * @param flags - CLI flags
 */
export async function configurePreferenceUpload(
  this: LocalContext,
  flags: ConfigurePreferenceUploadFlags,
): Promise<void> {
  const { auth, transcendUrl, directory, schemaFilePath } = flags;

  const files = collectCsvFilesOrExit(directory, this);
  doneInputValidation(this.process.exit);

  logger.info(
    colors.green(
      `Scanning ${files.length} CSV file(s) for headers and unique values...`,
    ),
  );

  // 1) Scan all files to discover the full column/value universe
  const { headers, uniqueValuesByColumn } = await scanCsvFiles(files);
  logger.info(
    colors.green(`Discovered ${headers.length} columns across all files.`),
  );

  // 2) Fetch org reference data
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { purposes, preferenceTopics, identifiers } = await loadReferenceData(
    client,
  );

  const allIdentifierNames = identifiers.map((id) => id.name);
  logger.info(
    colors.green(
      `Loaded ${purposes.length} purposes, ${preferenceTopics.length} preference topics, ${identifiers.length} identifiers from org.`,
    ),
  );

  // 3) Create or load persisted schema state
  const schemaFile = computeSchemaFile(schemaFilePath, directory, files[0]);
  const initial = {
    columnToPurposeName: {},
    lastFetchedAt: new Date().toISOString(),
    columnToIdentifier: {},
  } as const;
  const schemaState = new PersistedState(schemaFile, FileFormatState, initial);

  // 4) Interactive: select identifier columns
  const existingIdentifierCols = Object.keys(
    schemaState.getValue('columnToIdentifier'),
  );
  let identifierColumns: string[];
  if (existingIdentifierCols.length > 0) {
    logger.info(
      colors.magenta(
        `Existing identifier columns: ${existingIdentifierCols.join(', ')}`,
      ),
    );
    const { reuse } = await inquirer.prompt<{ reuse: boolean }>([
      {
        name: 'reuse',
        type: 'confirm',
        message: `Keep existing identifier column selection? (${existingIdentifierCols.join(
          ', ',
        )})`,
        default: true,
      },
    ]);
    identifierColumns = reuse
      ? existingIdentifierCols
      : (
          await inquirer.prompt<{ cols: string[] }>([
            {
              name: 'cols',
              type: 'checkbox',
              message: 'Select columns that are identifiers',
              choices: headers,
              validate: (v: string[]) =>
                v.length > 0 || 'Select at least one identifier column',
            },
          ])
        ).cols;
  } else {
    identifierColumns = (
      await inquirer.prompt<{ cols: string[] }>([
        {
          name: 'cols',
          type: 'checkbox',
          message: 'Select columns that are identifiers',
          choices: headers,
          validate: (v: string[]) =>
            v.length > 0 || 'Select at least one identifier column',
        },
      ])
    ).cols;
  }

  // 5) Map identifier columns to org identifier names (reuses existing parse logic)
  // We need a small sample of real rows so the identifier parser can validate.
  const sampleRows = readCsv(files[0], t.record(t.string, t.string));
  await parsePreferenceIdentifiersFromCsv(sampleRows, {
    schemaState,
    orgIdentifiers: identifiers,
    allowedIdentifierNames: allIdentifierNames,
    identifierColumns,
  });

  // 6) Interactive: select columns to ignore
  const mappedSoFar = [
    ...Object.keys(schemaState.getValue('columnToIdentifier')),
  ];
  const remainingForIgnore = headers.filter((h) => !mappedSoFar.includes(h));
  const existingIgnored = schemaState.getValue('columnsToIgnore') ?? [];

  let columnsToIgnore: string[];
  if (existingIgnored.length > 0) {
    logger.info(
      colors.magenta(`Existing ignored columns: ${existingIgnored.join(', ')}`),
    );
    const { reuse } = await inquirer.prompt<{ reuse: boolean }>([
      {
        name: 'reuse',
        type: 'confirm',
        message: `Keep existing ignored columns? (${existingIgnored.join(
          ', ',
        )})`,
        default: true,
      },
    ]);
    columnsToIgnore = reuse
      ? existingIgnored
      : (
          await inquirer.prompt<{ cols: string[] }>([
            {
              name: 'cols',
              type: 'checkbox',
              message:
                'Select columns to ignore (will not be mapped to purposes)',
              choices: remainingForIgnore,
            },
          ])
        ).cols;
  } else {
    columnsToIgnore = (
      await inquirer.prompt<{ cols: string[] }>([
        {
          name: 'cols',
          type: 'checkbox',
          message: 'Select columns to ignore (will not be mapped to purposes)',
          choices: remainingForIgnore,
        },
      ])
    ).cols;
  }
  schemaState.setValue(columnsToIgnore, 'columnsToIgnore');

  // 7) Build synthetic rows covering all unique values from every file
  const syntheticRows = buildSyntheticRows(headers, uniqueValuesByColumn);

  // 8) Select timestamp column
  await parsePreferenceFileFormatFromCsv(syntheticRows, schemaState);

  // 9) Map remaining columns to purposes/preferences + value mappings
  await parsePreferenceAndPurposeValuesFromCsv(syntheticRows, schemaState, {
    purposeSlugs: purposes.map((p) => p.trackingType),
    preferenceTopics,
    forceTriggerWorkflows: false,
    columnsToIgnore,
  });

  // 10) Validate completeness
  const identifierCols = Object.keys(
    schemaState.getValue('columnToIdentifier'),
  );
  const timestampCol = schemaState.getValue('timestampColumn');
  const purposeCols = Object.keys(schemaState.getValue('columnToPurposeName'));
  const ignoredCols = schemaState.getValue('columnsToIgnore') ?? [];
  const allMapped = new Set([
    ...identifierCols,
    ...purposeCols,
    ...ignoredCols,
    ...(timestampCol ? [timestampCol] : []),
  ]);
  const unmapped = headers.filter((h) => !allMapped.has(h));
  if (unmapped.length > 0) {
    logger.warn(
      colors.yellow(
        `Warning: the following columns are not mapped: ${unmapped.join(
          ', ',
        )}. ` +
          'They will cause errors during upload. Re-run this command to fix.',
      ),
    );
  }

  schemaState.setValue(new Date().toISOString(), 'lastFetchedAt');

  logger.info(colors.green(`\nConfiguration saved to: ${schemaFile}`));
  logger.info(
    colors.green(
      `  Identifiers: ${identifierCols.join(', ')}\n` +
        `  Ignored: ${ignoredCols.join(', ') || '(none)'}\n` +
        `  Timestamp: ${timestampCol || '(none)'}\n` +
        `  Purpose columns: ${purposeCols.join(', ')}`,
    ),
  );
}
