// groupBy
import { uniq, keyBy } from 'lodash-es';
import colors from 'colors';
import inquirer from 'inquirer';
import type { FileFormatState } from './codecs';
import { logger } from '../../logger';
import { inquirerConfirmBoolean } from '../helpers';
import { mapSeries } from 'bluebird';
import type { Identifier } from '../graphql';
import type { PreferenceStoreIdentifier } from '@transcend-io/privacy-types';
import type { PersistedState } from '@transcend-io/persisted-state';

/* eslint-disable no-param-reassign */

/**
 * Parse identifiers from a CSV list of preferences
 *
 * Ensures that all rows have a valid identifier
 * and that all identifiers are unique.
 *
 * @param preferences - List of preferences
 * @param options - Options
 * @returns The updated file metadata state
 */
export async function parsePreferenceIdentifiersFromCsv(
  preferences: Record<string, string>[],
  {
    schemaState,
    orgIdentifiers,
    allowedIdentifierNames,
    identifierColumns,
  }: {
    /** The current state of the schema metadata */
    schemaState: PersistedState<typeof FileFormatState>;
    /** The list of identifiers configured for the org */
    orgIdentifiers: Identifier[];
    /** The list of identifier names that are allowed for this upload */
    allowedIdentifierNames: string[];
    /** The columns in the CSV that should be used as identifiers */
    identifierColumns: string[];
  },
): Promise<{
  /** The updated state */
  schemaState: PersistedState<typeof FileFormatState>;
  /** The updated preferences */
  preferences: Record<string, string>[];
}> {
  const columnNames = uniq(
    preferences.map((x) => Object.keys(x)).flat(),
  ).filter((col) => identifierColumns.includes(col));
  // Determine columns to map
  const orgIdentifiersByName = keyBy(orgIdentifiers, 'name');
  const filteredOrgIdentifiers = allowedIdentifierNames
    .map((name) => orgIdentifiersByName[name])
    .filter(Boolean);
  if (filteredOrgIdentifiers.length !== allowedIdentifierNames.length) {
    const missingIdentifiers = allowedIdentifierNames.filter(
      (name) => !orgIdentifiersByName[name],
    );
    throw new Error(
      `No identifier configuration found for "${missingIdentifiers.join(
        '","',
      )}"`,
    );
  }
  if (columnNames.length !== identifierColumns.length) {
    const missingColumns = identifierColumns.filter(
      (col) => !columnNames.includes(col),
    );
    throw new Error(
      `The following identifier columns are missing from the CSV: "${missingColumns.join(
        '","',
      )}"`,
    );
  }

  if (
    filteredOrgIdentifiers.filter(
      (identifier) => identifier.isUniqueOnPreferenceStore,
    ).length === 0
  ) {
    throw new Error(
      'No unique identifier we provided as part of allowedIdentifierNames. Please ensure that at least one of the allowed ' +
        'identifiers is configured as unique on the preference store.',
    );
  }

  // Determine the columns that could potentially be used for identifiers
  const currentColumnToIdentifier = schemaState.getValue('columnToIdentifier');
  await mapSeries(identifierColumns, async (col) => {
    // Map the column to an identifier
    const identifierMapping = currentColumnToIdentifier[col];
    if (identifierMapping) {
      logger.info(
        colors.magenta(
          `Column "${col}" is associated with identifier "${identifierMapping.name}"`,
        ),
      );
      return;
    }
    // If the column is not mapped, ask the user to map it
    const { identifierName } = await inquirer.prompt<{
      /** Identifier name */
      identifierName: string;
    }>([
      {
        name: 'identifierName',
        message: `Choose the identifier name for column "${col}"`,
        type: 'list',
        // Default to the first allowed identifier name
        default: allowedIdentifierNames.find((x) => x.startsWith(col)),
        choices: allowedIdentifierNames,
      },
    ]);
    currentColumnToIdentifier[col] = {
      name: identifierName,
      isUniqueOnPreferenceStore:
        orgIdentifiersByName[identifierName].isUniqueOnPreferenceStore,
    };
  });
  schemaState.setValue(currentColumnToIdentifier, 'columnToIdentifier');

  const uniqueIdentifierColumns = Object.entries(currentColumnToIdentifier)
    .filter(
      ([, identifierMapping]) => identifierMapping.isUniqueOnPreferenceStore,
    )
    .map(([col]) => col);

  // Validate that the at least 1 unique identifier column is present
  const uniqueIdentifierMissingIndexes = preferences
    .map((pref, ind) =>
      uniqueIdentifierColumns.some((col) => !!pref[col]) ? null : [ind],
    )
    .filter((x): x is number[] => !!x)
    .flat();

  if (uniqueIdentifierMissingIndexes.length > 0) {
    const msg = `
    The following rows ${uniqueIdentifierMissingIndexes.join(
      ', ',
    )} do not have any unique identifier values for the columns "${uniqueIdentifierColumns.join(
      '", "',
    )}".`;
    logger.warn(colors.yellow(msg));

    // Ask user if they would like to skip rows missing an identifier
    const skip = await inquirerConfirmBoolean({
      message: 'Would you like to skip rows missing unique identifiers?',
    });
    if (!skip) {
      throw new Error(msg);
    }

    // Filter out rows missing an identifier
    const previous = preferences.length;
    preferences = preferences.filter(
      (pref, index) => !uniqueIdentifierMissingIndexes.includes(index),
    );
    logger.info(
      colors.yellow(
        `Skipped ${
          previous - preferences.length
        } rows missing unique identifiers`,
      ),
    );
  }
  logger.info(
    colors.magenta(
      `At least one unique identifier column is present for all ${preferences.length} rows.`,
    ),
  );

  return { schemaState, preferences };
}
/* eslint-enable no-param-reassign */

/**
 * Helper function to get the identifiers payload from a row
 *
 * @param options - Options
 * @param options.row - The current row from CSV file
 * @param options.columnToIdentifier - The column to identifier mapping metadata
 * @returns The updated preferences with identifiers payload
 */
export function getPreferenceIdentifiersFromRow({
  row,
  columnToIdentifier,
}: {
  /** The current row from CSV file */
  row: Record<string, string>;
  /** The current file metadata state */
  columnToIdentifier: FileFormatState['columnToIdentifier'];
}): PreferenceStoreIdentifier[] {
  // TODO: Remove this COSTCO specific logic
  const emailColumn = Object.keys(columnToIdentifier).find((x) =>
    x.includes('email'),
  );
  if (!emailColumn) {
    throw new Error('Email column not found in csv file.');
  }
  return (
    Object.entries(columnToIdentifier)
      .filter(([col]) => !!row[col])
      // TODO: Remove this COSTCO specific logic
      .filter(
        ([col]) => !(col === 'transcendID' && row[col] && row[emailColumn]),
      )
      .map(([col, identifierMapping]) => ({
        name: identifierMapping.name,
        value: row[col],
      }))
  );
}

/**
 * Helper function to get unique identifier name present in a row
 *
 * @param options - Options
 * @param options.row - The current row from CSV file
 * @param options.columnToIdentifier - The column to identifier mapping metadata
 * @returns The unique identifier names present in the row
 */
export function getUniquePreferenceIdentifierNamesFromRow({
  row,
  columnToIdentifier,
}: {
  /** The current row from CSV file */
  row: Record<string, string>;
  /** The current file metadata state */
  columnToIdentifier: FileFormatState['columnToIdentifier'];
}): string[] {
  // FIXME remove email logic
  const columns = Object.keys(columnToIdentifier).filter(
    (col) => row[col] && columnToIdentifier[col].isUniqueOnPreferenceStore,
  );
  // if email is present move it to front of list
  if (columns.includes('email')) {
    columns.splice(columns.indexOf('email'), 1);
    columns.unshift('email');
  }
  return columns;
}

/**
 * Add Transcend ID to preferences if email_id is present
 *
 * @param preferences - List of preferences
 * @returns The updated preferences with Transcend ID added
 *   // FIXME: Remove this COSTCO specific logic
 */
export async function addTranscendIdToPreferences(
  preferences: Record<string, string>[],
): Promise<Record<string, string>[]> {
  // const haveTranscendId = await inquirerConfirmBoolean({
  //   message: 'Would you like transcendID for costco upload?',
  // });
  // if (!haveTranscendId) {
  //   logger.info(colors.yellow('Skipping adding Transcend ID to preferences.'));
  //   return preferences;
  // }
  // Add a transcendent ID to each preference if it doesn't already exist
  const emailList = (process.env.EMAIL_LIST || '')
    .split(',')
    .map((email) => email.trim().split('"').join('').split('"').join(''));
  const disallowedEmails = [
    'noemail@costco.com',
    'NOEMAILYET@GMAIL.COM',
    'noemail@gmail.com',
    'noemail@aol.com',
    'IDONTCARE@YAHOO.COM',
    'none@none.com',
    'noemail@mail.com',
    'no@email.com',
    'noemail@no.com',
    '123@gmail.com',
    'no.no@gmail.com',
    'BC@GMAIL.COM',
    'NA@COMCAST.NET',
    'NO@YAHOO.COM',
    'R@GMAIL.COM',
    'noemail@email.com',
    'NOEMAIL@ME.COM',
    'NONAME@GMAIL.COM',
    'NOEMAIL@HOTMAIL.COM',
    'notoemail@gmail.com',
    'NOMAIL@MAIL.COM',
    'DONOTHAVE@YAHOO.COM',
    'NAME1@AOL.COM',
    'DAN@GMAIL.COM',
    'NA@YAHOO.COM',
    'NONE.NONE@GMAIL.COM',
    'KC@COSTCO.COM',
    'NONE1@GMAIL.COM',
    'NONE@HOTMAIL.COM',
    'COSTCO@NON.COM',
    'NOEMAILATM@YAHOO.COM',
    'NO@MAIL.COM',
    'N@N.COM',
    'NOEMAIL@COSTOC.COM',
    'DONTHAVEEMAIL@YAHOO.COM',
    'PAT@GMAIL.COM',
    'NO@NOEMAIL.COM',
    'sam@gmail.com',
    'OPTOUT@NOEMAIL.NET',
    'M@GMAIL.COM',
    'ADDEMAIL@YAHOO.COM',
    'JM@YAHOO.COM',
    'NOEMAIL@INTERNET.COM',
    'sam@gmail.com',
    'NO@AOL.COM',
    '111@GMAIL.COM',
    'NOTHING@HOTMAIL.COM',
    'CHEN@GMAIL.COM',
    'JM@YAHOO.COM',
    'M@GMAIL.COM',
    'WII@GMAIL.COM',
    'NOTHANKS@COSTCO.COM',
    'NOGMAIL@GMAIL.COM',
    'NA@NA.COM',
    'NOPE@COSTCO.COM',
    'USER@GMAIL.COM',
    'Noemail@outlook.com',
    'none@gmail.com',
    'GETEMAIL@GMAIL.COM',
    'EMAIL@EMAIL.COM',
    'NAME@AOL.COM',
    'NOTHING@GMAIL.COM',
    'NO2@GMAIL.COM',
    'NO@INFO.COM',
    'NOMAIL@NOMAIL.COM',
    'COSTCO@GMAIL.COM',
    'NO@NE.COM',
    'NONE@AOL.COM',
    'donthave@hotmail.com',
    'FIRSTNAME.LASTNAME@GMAIL.COM',
    'NOEMAIL@COSTO.COM',
    'update@gmail.com',
    'NOMAIL@MAIL.COM ',
    'JUNKMAILER@AOL.COM',
    'noemail@yahoo.com',
    'EMAIL@GMAIL.COM',
    'no@gmail.com',
    'na@gmail.com',
    'NOMAIL@GMAIL.COM',
    'costco@costco.com',
    'ABC@GMAIL.COM',
    'noemail@noemail.com',
    'replace@gmail.com',
    'j@gmail.com',
    'NONE@YAHOO.COM',
    'JESUS@GMAIL.COM',
    'a@gmail.com',
    'ME@ME.COM',
    'NEEDEMAIL@GMAIL.COM',
    '_NONE@EMAIL.COM',
    'NONE1@YAHOO.COM',
    'NOMEMBEREMAIL@COSTCO.COM',
    'MAILDUMP@MAIL.COM',
    'NONE@EMAIL.COM',
    'no@no.com',
    'none@outlook.com',
    'none@yahoo.com',
    '123@LIVE.COM',
    // FIXME
    ...emailList,
  ].map((email) => email.toLowerCase());
  console.log(emailList[0], emailList[50]);

  return preferences.map((pref) => {
    const email = (pref.email_address || '').toLowerCase().trim();
    return {
      ...pref,
      person_id: pref.person_id !== '-2' ? pref.person_id : '',
      email_address:
        !email || disallowedEmails.includes(email) ? '' : pref.email_address, // FIXME
      transcendID:
        pref.person_id && pref.person_id !== '-2'
          ? pref.person_id
          : pref.member_id,
    };
  });
}
