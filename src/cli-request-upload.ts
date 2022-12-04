#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import inquirer from 'inquirer';
import * as t from 'io-ts';
import uniq from 'lodash/uniq';
import autoCompletePrompt from 'inquirer-autocomplete-prompt';

import { NORMALIZE_PHONE_NUMBER } from '@transcend-io/privacy-types';
import { PersistedState } from '@transcend-io/persisted-state';
import { logger } from './logger';
import {
  createSombraGotInstance,
  buildTranscendGraphQLClient,
} from './graphql';
import {
  mapRequestEnumValues,
  CachedState,
  mapCsvColumnsToApi,
  parseAttributesFromString,
  readCsv,
  AttestedExtraIdentifiers,
  submitPrivacyRequest,
  filterRows,
  mapCsvRowsToRequestInputs,
} from './requests';

// Allow for autocomplete functionality
inquirer.registerPrompt('autocomplete', autoCompletePrompt);

/**
 * Upload a CSV of Privacy Requests.
 *
 * Requirements:
 *
 * 1. Create API key with follow scopes: https://app.transcend.io/infrastructure/api-keys
 *    - "Submit New Data Subject Request"
 *    - "View Identity Verification Settings"
 * 2. Invite a new user into the dashboard with no scopes but email/password login (needed for diffie hellman channel)
 *
 * Dev Usage: FIXME
 * yarn ts-node ./src/cli-discover-silos.ts --auth=asd123 \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *
 * Standard usage: FIXME
 * CSV_FILE_PATH="/Users/michaelfarrell/Desktop/test.csv" \
 *   yarn script new-features/bulk_upload_requests --auth=abcdefg --dryRun=true
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './requests.csv',
    transcendApiUrl = 'https://api.transcend.io',
    cacheFilepath = './transcend-privacy-requests-cache.json',
    auth,
    sombraAuth,
    isTest = 'false',
    dryRun = 'false',
    skipFilterStep = 'false',
    attributes = 'Tags:transcend-bulk-upload',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=asd123',
      ),
    );
    process.exit(1);
  }

  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = parseAttributesFromString(attributes.split(','));

  // Create a new state to persist the metadata that
  // maps the request inputs to the Transcend API shape
  const state = new PersistedState(cacheFilepath, CachedState, {});
  let cached = state.getValue(file) || {
    columnNames: {},
    requestTypeToRequestAction: {},
    subjectTypeToSubjectName: {},
    languageToLocale: {},
    statusToRequestStatus: {},
    failingRequests: [],
  };

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(
    transcendApiUrl,
    auth,
    sombraAuth,
  );

  // Read in the list of integration requests
  const requestsList = readCsv(file, t.record(t.string, t.string));
  const columnNames = uniq(requestsList.map((x) => Object.keys(x)).flat());

  // Log out an example request
  if (requestsList.length === 0) {
    throw new Error(
      'No Requests found in list! Ensure the first row of the CSV is a header and the rest are requests.',
    );
  }
  const firstRequest = requestsList[0];

  logger.info(
    colors.magenta(`First request: ${JSON.stringify(firstRequest, null, 2)}`),
  );

  // Determine what rows in the CSV should be imported
  // Choose columns that contain metadata to filter the requests
  const filteredRequestList =
    skipFilterStep === 'true' ? requestsList : await filterRows(requestsList);

  // FIXME map over ALL columns for attributes

  // Determine the columns that should be mapped
  const columnNameMap = await mapCsvColumnsToApi(columnNames, cached);
  state.setValue(cached, file);
  await mapRequestEnumValues(
    buildTranscendGraphQLClient(transcendApiUrl, auth),
    filteredRequestList,
    {
      fileName: file,
      state,
      columnNameMap,
    },
  );
  cached = state.getValue(file);

  // map the CSV to request input
  const requestInputs = mapCsvRowsToRequestInputs(
    filteredRequestList,
    cached,
    columnNameMap,
  );

  // Submit each request
  // FIXME parallelism
  await mapSeries(requestInputs, async ([rawRow, requestInput], ind) => {
    logger.info(
      colors.magenta(
        `[${ind}/${requestInputs.length}] Importing: ${JSON.stringify(
          requestInput,
          null,
          2,
        )}`,
      ),
    );

    const attestedExtraIdentifiers: AttestedExtraIdentifiers = {};

    // add phone number
    if (rawRow['Phone Number']) {
      if (!attestedExtraIdentifiers.phone) {
        attestedExtraIdentifiers.phone = [];
      }
      attestedExtraIdentifiers.phone.push({
        value: rawRow['Phone Number']
          .replace(NORMALIZE_PHONE_NUMBER, '')
          .replace(/[A-Za-z]/g, ''),
        name: 'phone',
      });
    }

    // uncomment to add support for custom identifiers
    // if (rawRow.Address) {
    //  if (!attestedExtraIdentifiers.custom) {
    //    attestedExtraIdentifiers.custom = [];
    //  }
    //  attestedExtraIdentifiers.custom.push({
    //    value: rawRow.Address,
    //    name: 'address',
    //  });
    // }
    // if (rawRow['User Identifier']) {
    //  const id = rawRow['User Identifier'];
    //  if (!attestedExtraIdentifiers.custom) {
    //    attestedExtraIdentifiers.custom = [];
    //  }
    //  attestedExtraIdentifiers.custom.push({
    //    value: id,
    //    name: 'user_id',
    //  });
    // }
    // if (rawRow['First Name'] || rawRow['Last Name']) {
    //  let name = '';
    //  if (rawRow['First Name']) {
    //    name += rawRow['First Name'];
    //  }
    //  if (rawRow['Last Name']) {
    //    if (name) {
    //      name += ' ';
    //    }
    //    name += rawRow['Last Name'];
    //  }
    //  if (!attestedExtraIdentifiers.custom) {
    //    attestedExtraIdentifiers.custom = [];
    //  }
    //  attestedExtraIdentifiers.custom.push({
    //    value: name,
    //    name: 'Full_name',
    //  });
    // }

    // Skip on dry run
    if (dryRun === 'true') {
      logger.info(colors.magenta('Bailing out on dry run'));
      logger.info(
        colors.magenta(JSON.stringify(attestedExtraIdentifiers, null, 2)),
      );
      return;
    }

    try {
      // Make the GraphQL request to submit the privacy request
      const requestResponse = await submitPrivacyRequest(sombra, requestInput, {
        details: `Uploaded by Transcend script: "bulk_upload_requests" : ${JSON.stringify(
          rawRow,
          null,
          2,
        )}`,
        isTest: isTest === 'true',
        additionalAttributes: parsedAttributes,
      });

      logger.info(
        colors.green(
          // eslint-disable-next-line max-len
          `[${ind}/${requestInputs.length}] Successfully submitted the test data subject request for email: "${requestInput.email}"`,
        ),
      );
      logger.info(
        colors.green(
          `[${ind}/${requestInputs.length}] View it at: "${requestResponse.link}"`,
        ),
      );
    } catch (err) {
      const msg = `${err.message} - ${JSON.stringify(
        err.response?.body,
        null,
        2,
      )}`;
      cached.failingRequests.push({
        ...requestInput,
        error: msg,
        attemptedAt: new Date().toISOString(),
      });
      state.setValue(cached, file);
      logger.error(colors.red(msg));
      logger.error(
        colors.red(
          `[${ind}/${requestInputs.length}] Failed to submit request for: "${requestInput.email}"`,
        ),
      );
    }
  });
}

main();
