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
 * Scan a single CSV file and collect its column headers plus all unique
 * values per column. Uses streaming so large files don't need to be held
 * in memory.
 *
 * @param file - CSV file path to scan
 * @returns headers and uniqueValuesByColumn
 */
async function scanOneFile(file: string): Promise<{
  headers: Set<string>;
  uniqueValuesByColumn: Record<string, Set<string>>;
}> {
  const headers = new Set<string>();
  const uniqueValuesByColumn: Record<string, Set<string>> = {};

  await new Promise<void>((resolve, reject) => {
    const parser = createReadStream(file).pipe(
      csvParse({ columns: true, skip_empty_lines: true }),
    );
    parser.on('data', (row: Record<string, string>) => {
      for (const [col, val] of Object.entries(row)) {
        headers.add(col);
        if (!uniqueValuesByColumn[col]) {
          uniqueValuesByColumn[col] = new Set();
        }
        const trimmed = (val || '').trim();
        uniqueValuesByColumn[col].add(trimmed);
      }
    });
    parser.on('end', resolve);
    parser.on('error', reject);
  });

  return { headers, uniqueValuesByColumn };
}

const SCAN_CONCURRENCY = 25;

async function scanCsvFiles(files: string[]): Promise<{
  /** Union of all column headers */
  headers: string[];
  /** Map of column name to its unique values (trimmed, non-empty) */
  uniqueValuesByColumn: Record<string, Set<string>>;
}> {
  const allHeaders = new Set<string>();
  const merged: Record<string, Set<string>> = {};
  let completed = 0;

  const queue = [...files];
  const run = async (): Promise<void> => {
    while (queue.length > 0) {
      const file = queue.shift()!;
      const result = await scanOneFile(file);
      for (const h of result.headers) allHeaders.add(h);
      for (const [col, vals] of Object.entries(result.uniqueValuesByColumn)) {
        if (!merged[col]) merged[col] = new Set();
        for (const v of vals) merged[col].add(v);
      }
      completed += 1;
      if (completed % 25 === 0 || completed === files.length) {
        logger.info(
          colors.green(`  Scanned ${completed}/${files.length} files...`),
        );
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(SCAN_CONCURRENCY, files.length) },
    () => run(),
  );
  await Promise.all(workers);

  return { headers: [...allHeaders], uniqueValuesByColumn: merged };
}

/**
 * Build synthetic preference rows from the scanned unique values so
 * the existing parse functions see every value at least once.
 *
 * Row count is driven only by `enumColumns` (purpose/preference columns)
 * whose unique values actually matter for mapping. High-cardinality
 * columns like timestamps or emails are filled with a single sample value.
 *
 * @param headers - all column headers
 * @param uniqueValuesByColumn - unique values per column
 * @param enumColumns - columns whose full unique values must be represented
 * @returns synthetic rows covering all unique enum values
 */
function buildSyntheticRows(
  headers: string[],
  uniqueValuesByColumn: Record<string, Set<string>>,
  enumColumns: string[] = [],
): Record<string, string>[] {
  const enumSet = new Set(enumColumns);
  const maxRows = Math.max(
    1,
    ...enumColumns.map((h) => uniqueValuesByColumn[h]?.size ?? 0),
  );
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < maxRows; i += 1) {
    const row: Record<string, string> = {};
    for (const h of headers) {
      const vals = uniqueValuesByColumn[h]
        ? [...uniqueValuesByColumn[h]]
        : [''];
      row[h] = enumSet.has(h) ? vals[i % vals.length] ?? '' : vals[0] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Interactively configure the column mapping for preference CSV uploads.
 *
 * Scans ALL CSV files in a directory, discovers every header and unique value,
 * then walks the user through mapping identifiers, timestamps,
 * purpose/preference value mappings, and metadata columns.
 * Saves the result as a reusable config.
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
  logger.info(colors.green('\n[Step 1/6] Identifier column selection...'));
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

  // 5) Map identifier columns to org identifier names
  logger.info(
    colors.green(
      `\n[Step 2/6] Identifier name mapping (validating sample: ${files[0]})...`,
    ),
  );
  const sampleRows = readCsv(files[0], t.record(t.string, t.string));
  await parsePreferenceIdentifiersFromCsv(sampleRows, {
    schemaState,
    orgIdentifiers: identifiers,
    allowedIdentifierNames: allIdentifierNames,
    identifierColumns,
  });

  const identifierCols = Object.keys(
    schemaState.getValue('columnToIdentifier'),
  );

  // 6) Select timestamp column (only needs column names, not full rows)
  logger.info(colors.green('\n[Step 3/6] Timestamp column selection...'));
  const timestampChoices = headers.filter((h) => !identifierCols.includes(h));
  await parsePreferenceFileFormatFromCsv(
    [
      Object.fromEntries(
        timestampChoices.map((h) => [
          h,
          [...(uniqueValuesByColumn[h] ?? [])][0] ?? '',
        ]),
      ),
    ],
    schemaState,
  );

  // 7) Select which remaining columns map to purposes/preferences
  logger.info(
    colors.green('\n[Step 4/6] Purpose/preference column selection...'),
  );
  const timestampCol = schemaState.getValue('timestampColumn');
  const mappedSoFar = [
    ...identifierCols,
    ...(timestampCol ? [timestampCol] : []),
  ];
  const remainingColumns = headers.filter((h) => !mappedSoFar.includes(h));

  const { purposeColumns } = await inquirer.prompt<{
    purposeColumns: string[];
  }>([
    {
      name: 'purposeColumns',
      type: 'checkbox',
      message: 'Select columns that map to purposes/preferences',
      choices: remainingColumns,
      validate: (v: string[]) =>
        v.length > 0 || 'Select at least one purpose column',
    },
  ]);

  const nonPurposeColumns = remainingColumns.filter(
    (h) => !purposeColumns.includes(h),
  );

  // 8) Build synthetic rows driven ONLY by purpose column unique values
  logger.info(colors.green('\n[Step 5/6] Mapping purpose values...'));
  const syntheticRows = buildSyntheticRows(
    headers,
    uniqueValuesByColumn,
    purposeColumns,
  );
  logger.info(
    colors.green(
      `  Built ${syntheticRows.length} synthetic rows ` +
        `(from ${purposeColumns.length} purpose columns).`,
    ),
  );

  // 9) Map purpose columns to org purposes + value mappings
  await parsePreferenceAndPurposeValuesFromCsv(syntheticRows, schemaState, {
    purposeSlugs: purposes.map((p) => p.trackingType),
    preferenceTopics,
    forceTriggerWorkflows: false,
    columnsToIgnore: nonPurposeColumns,
  });

  // 10) Metadata: select which remaining columns to INCLUDE as metadata
  logger.info(colors.green('\n[Step 6/6] Metadata column selection...'));
  if (nonPurposeColumns.length > 0) {
    logger.info(
      colors.magenta(
        '\nRemaining unmapped columns:\n' +
          `  ${nonPurposeColumns.join(', ')}\n`,
      ),
    );

    const { metadataColumns } = await inquirer.prompt<{
      metadataColumns: string[];
    }>([
      {
        name: 'metadataColumns',
        type: 'checkbox',
        message:
          'Select columns to INCLUDE as metadata ' +
          '(unselected columns will be ignored)',
        choices: nonPurposeColumns,
      },
    ]);

    const ignored = nonPurposeColumns.filter(
      (c) => !metadataColumns.includes(c),
    );

    if (ignored.length > 0) {
      schemaState.setValue(ignored, 'columnsToIgnore');
    }

    if (metadataColumns.length > 0) {
      const columnToMetadata: Record<string, { key: string }> = {};
      for (const col of metadataColumns) {
        columnToMetadata[col] = { key: col };
      }
      schemaState.setValue(columnToMetadata, 'columnToMetadata');
    }

    logger.info(
      colors.green(
        `  Metadata: ${
          metadataColumns.length > 0 ? metadataColumns.join(', ') : '(none)'
        }`,
      ),
    );
    logger.info(
      colors.green(
        `  Ignored: ${ignored.length > 0 ? ignored.join(', ') : '(none)'}`,
      ),
    );
  }

  // 11) Validate completeness
  const purposeCols = Object.keys(schemaState.getValue('columnToPurposeName'));
  const ignoredCols = schemaState.getValue('columnsToIgnore') ?? [];
  const metadataCols = Object.keys(
    schemaState.getValue('columnToMetadata') ?? {},
  );
  const allMapped = new Set([
    ...identifierCols,
    ...purposeCols,
    ...ignoredCols,
    ...metadataCols,
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
        `  Timestamp: ${timestampCol || '(none)'}\n` +
        `  Purpose columns: ${purposeCols.join(', ')}\n` +
        `  Metadata: ${metadataCols.join(', ') || '(none)'}\n` +
        `  Ignored: ${ignoredCols.join(', ') || '(none)'}`,
    ),
  );
}
