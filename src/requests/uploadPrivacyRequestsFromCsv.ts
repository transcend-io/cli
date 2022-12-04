import colors from 'colors';
import { map } from 'bluebird';
import * as t from 'io-ts';
import uniq from 'lodash/uniq';

import { PersistedState } from '@transcend-io/persisted-state';
import { logger } from '../logger';
import {
  createSombraGotInstance,
  buildTranscendGraphQLClient,
} from '../graphql';
import { mapRequestEnumValues } from './mapRequestEnumValues';
import { CachedState } from './constants';
import { mapCsvColumnsToApi } from './mapCsvColumnsToApi';
import { parseAttributesFromString } from './parseAttributesFromString';
import { readCsv } from './readCsv';
import { submitPrivacyRequest } from './submitPrivacyRequest';
import { mapColumnsToAttributes } from './mapColumnsToAttributes';
import { mapColumnsToIdentifiers } from './mapColumnsToIdentifiers';
import { mapCsvRowsToRequestInputs } from './mapCsvRowsToRequestInputs';
import { filterRows } from './filterRows';

/**
 * Upload a set of privacy requests from CSV
 *
 * @param options - Options
 */
export async function uploadPrivacyRequestsFromCsv({
  cacheFilepath,
  file,
  auth,
  sombraAuth,
  concurrency = 20,
  transcendApiUrl = 'https://api.transcend.io',
  attributes = [],
  emailIsVerified = true,
  skipFilterStep = false,
  isTest = false,
  isSilent = true,
  dryRun = false,
}: {
  /** File to cache metadata about mapping of CSV shape to script */
  cacheFilepath: string;
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Concurrency to upload in */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendApiUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Skip the step where requests are filtered */
  skipFilterStep?: boolean;
  /** Whether test requests are being uploaded */
  isTest?: boolean;
  /** Whether requests are uploaded in silent mode */
  isSilent?: boolean;
  /** Whether the email was verified up front */
  emailIsVerified?: boolean;
  /** Attributes string pre-parse */
  attributes?: string[];
  /** Whether a dry run is happening */
  dryRun?: boolean;
}): Promise<void> {
  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = parseAttributesFromString(attributes);

  // Create a new state to persist the metadata that
  // maps the request inputs to the Transcend API shape
  const state = new PersistedState(cacheFilepath, CachedState, {});
  let cached = state.getValue(file) || {
    columnNames: {},
    requestTypeToRequestAction: {},
    subjectTypeToSubjectName: {},
    languageToLocale: {},
    statusToRequestStatus: {},
    identifierNames: {},
    attributeNames: {},
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
  const filteredRequestList = skipFilterStep
    ? requestsList
    : await filterRows(requestsList);

  // Build a GraphQL client
  const client = buildTranscendGraphQLClient(transcendApiUrl, auth);

  // Determine the columns that should be mapped
  const columnNameMap = await mapCsvColumnsToApi(columnNames, cached);
  state.setValue(cached, file);
  const identifierNameMap = await mapColumnsToIdentifiers(
    client,
    columnNames,
    cached,
  );
  state.setValue(cached, file);
  const attributeNameMap = await mapColumnsToAttributes(
    client,
    columnNames,
    cached,
  );
  await mapRequestEnumValues(client, filteredRequestList, {
    fileName: file,
    state,
    columnNameMap,
  });
  cached = state.getValue(file);

  // map the CSV to request input
  const requestInputs = mapCsvRowsToRequestInputs(filteredRequestList, cached, {
    columnNameMap,
    identifierNameMap,
    attributeNameMap,
  });

  // Submit each request
  await map(
    requestInputs,
    async ([rawRow, requestInput], ind) => {
      logger.info(
        colors.magenta(
          `[${ind}/${requestInputs.length}] Importing: ${JSON.stringify(
            requestInput,
            null,
            2,
          )}`,
        ),
      );

      // Skip on dry run
      if (dryRun) {
        logger.info(
          colors.magenta('Bailing out on dry run because dryRun is set'),
        );
        return;
      }

      try {
        // Make the GraphQL request to submit the privacy request
        const requestResponse = await submitPrivacyRequest(
          sombra,
          requestInput,
          {
            details: `Uploaded by Transcend Cli: "tr-request-upload" : ${JSON.stringify(
              rawRow,
              null,
              2,
            )}`,
            isTest,
            emailIsVerified,
            isSilent,
            additionalAttributes: parsedAttributes,
          },
        );

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
    },
    {
      concurrency,
    },
  );
}
