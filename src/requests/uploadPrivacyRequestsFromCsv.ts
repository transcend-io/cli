import colors from 'colors';
import { map } from 'bluebird';
import * as t from 'io-ts';
import uniq from 'lodash/uniq';
import cliProgress from 'cli-progress';

import { PersistedState } from '@transcend-io/persisted-state';
import { logger } from '../logger';
import {
  createSombraGotInstance,
  buildTranscendGraphQLClient,
  fetchAllRequestAttributeKeys,
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

// FIXME move
const CLIENT_ERROR = /{\\"message\\":\\"(.+?)\\",/;
const extractClientError = (err: string): string | null =>
  CLIENT_ERROR.test(err) ? CLIENT_ERROR.exec(err)[1] : null;

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
  defaultPhoneCountryCode = '1', // USA
  transcendApiUrl = 'https://api.transcend.io',
  attributes = [],
  emailIsVerified = true,
  ignoreDuplicates = false,
  clearSuccessfulRequests = false,
  clearFailingRequests = false,
  skipFilterStep = false,
  isTest = false,
  isSilent = true,
  debug = false,
  dryRun = false,
}: {
  /** File to cache metadata about mapping of CSV shape to script */
  cacheFilepath: string;
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Default country code for phone numbers */
  defaultPhoneCountryCode?: string;
  /** Concurrency to upload in */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendApiUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Include debug logs */
  debug?: boolean;
  /** Skip the step where requests are filtered */
  skipFilterStep?: boolean;
  /** Whether test requests are being uploaded */
  isTest?: boolean;
  /** When true, do not log duplicate requests as errors */
  ignoreDuplicates?: boolean;
  /** When true, clear out the failed requests */
  clearFailingRequests?: boolean;
  /** When true, clear out the successful requests */
  clearSuccessfulRequests?: boolean;
  /** Whether requests are uploaded in silent mode */
  isSilent?: boolean;
  /** Whether the email was verified up front */
  emailIsVerified?: boolean;
  /** Attributes string pre-parse */
  attributes?: string[];
  /** Whether a dry run is happening */
  dryRun?: boolean;
}): Promise<void> {
  // Time duration
  const t0 = new Date().getTime();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

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
    successfulRequests: [],
    duplicateRequests: [],
    failingRequests: [],
  };

  if (clearFailingRequests) {
    cached.failingRequests = [];
    state.setValue(cached, file);
  }
  if (clearSuccessfulRequests) {
    cached.successfulRequests = [];
    state.setValue(cached, file);
  }

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

  if (debug) {
    logger.info(
      colors.magenta(`First request: ${JSON.stringify(firstRequest, null, 2)}`),
    );
  }

  // Determine what rows in the CSV should be imported
  // Choose columns that contain metadata to filter the requests
  const filteredRequestList = skipFilterStep
    ? requestsList
    : await filterRows(requestsList);

  // Build a GraphQL client
  const client = buildTranscendGraphQLClient(transcendApiUrl, auth);

  // Grab the request attributes
  const requestAttributeKeys = await fetchAllRequestAttributeKeys(client);

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
    requestAttributeKeys,
  );
  state.setValue(cached, file);
  await mapRequestEnumValues(client, filteredRequestList, {
    fileName: file,
    state,
    columnNameMap,
  });
  cached = state.getValue(file);

  // map the CSV to request input
  const requestInputs = mapCsvRowsToRequestInputs(filteredRequestList, cached, {
    defaultPhoneCountryCode,
    columnNameMap,
    identifierNameMap,
    attributeNameMap,
    requestAttributeKeys,
  });

  // start the progress bar with a total value of 200 and start value of 0
  if (!debug) {
    progressBar.start(requestInputs.length, 0);
  }
  let total = 0;
  // Submit each request
  await map(
    requestInputs,
    async ([rawRow, requestInput], ind) => {
      // The identifier to log, only include personal data if debug mode is on
      const requestLogId = debug
        ? `email:${requestInput.email} | coreIdentifier:${requestInput.coreIdentifier}`
        : `row:${ind.toString()}`;

      if (debug) {
        logger.info(
          colors.magenta(
            `[${ind}/${requestInputs.length}] Importing: ${JSON.stringify(
              requestInput,
              null,
              2,
            )}`,
          ),
        );
      }

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

        // Log success
        if (debug) {
          logger.info(
            colors.green(
              `[${ind}/${requestInputs.length}] Successfully submitted the test data subject request: "${requestLogId}"`,
            ),
          );
          logger.info(
            colors.green(
              `[${ind}/${requestInputs.length}] View it at: "${requestResponse.link}"`,
            ),
          );
        }

        // Cache successful upload
        cached.successfulRequests.push({
          id: requestResponse.id,
          link: requestResponse.link,
          coreIdentifier: requestResponse.coreIdentifier,
          attemptedAt: new Date().toISOString(),
        });
        state.setValue(cached, file);
      } catch (err) {
        const msg = `${err.message} - ${JSON.stringify(
          err.response?.body,
          null,
          2,
        )}`;
        const clientError = extractClientError(msg);

        if (
          ignoreDuplicates &&
          clientError === 'Client error: You have already made this request.'
        ) {
          if (debug) {
            logger.info(
              colors.yellow(
                `[${ind}/${requestInputs.length}] Skipping request as it is a duplicate`,
              ),
            );
          }
          cached.duplicateRequests.push({
            coreIdentifier: requestInput.coreIdentifier,
            attemptedAt: new Date().toISOString(),
          });
          state.setValue(cached, file);
        } else {
          cached.failingRequests.push({
            ...requestInput,
            error: clientError || msg,
            attemptedAt: new Date().toISOString(),
          });
          state.setValue(cached, file);
          if (debug) {
            logger.error(colors.red(clientError || msg));
            logger.error(
              colors.red(
                `[${ind}/${requestInputs.length}] Failed to submit request for: "${requestLogId}"`,
              ),
            );
          }
        }
      }

      total += 1;
      if (!debug) {
        progressBar.update(total);
      }
    },
    {
      concurrency,
    },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  // Log completion time
  logger.info(
    colors.green(`Completed upload in "${totalTime / 1000}" seconds.`),
  );

  // Log duplicates
  if (cached.duplicateRequests.length > 0) {
    logger.info(
      colors.magenta(
        `Encountered "${cached.duplicateRequests.length}" duplicate requests. ` +
          `See "${cacheFilepath}" to review the core identifiers for these requests.`,
      ),
    );
  }

  // Log errors
  if (cached.failingRequests.length > 0) {
    logger.error(
      colors.red(
        `Encountered "${cached.failingRequests.length}" errors. ` +
          `See "${cacheFilepath}" to review the error messages and inputs.`,
      ),
    );
    process.exit(1);
  }
}
