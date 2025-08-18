/* eslint-disable max-lines */
import colors from 'colors';
import { map } from 'bluebird';
import * as t from 'io-ts';
import { uniq } from 'lodash-es';
import cliProgress from 'cli-progress';
import { join } from 'node:path';
import { PersistedState } from '@transcend-io/persisted-state';
import { logger } from '../../logger';
import {
  createSombraGotInstance,
  buildTranscendGraphQLClient,
  fetchAllRequestAttributeKeys,
} from '../graphql';
import { mapRequestEnumValues } from './mapRequestEnumValues';
import { CachedRequestState, CachedFileState } from './constants';
import { mapCsvColumnsToApi } from './mapCsvColumnsToApi';
import { parseAttributesFromString } from './parseAttributesFromString';
import { readCsv } from './readCsv';
import { submitPrivacyRequest } from './submitPrivacyRequest';
import { mapColumnsToAttributes } from './mapColumnsToAttributes';
import { mapColumnsToIdentifiers } from './mapColumnsToIdentifiers';
import { mapCsvRowsToRequestInputs } from './mapCsvRowsToRequestInputs';
import { filterRows } from './filterRows';
import { extractClientError } from './extractClientError';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Upload a set of privacy requests from CSV
 *
 * @param options - Options
 */
export async function uploadPrivacyRequestsFromCsv({
  cacheFilepath,
  requestReceiptFolder,
  file,
  auth,
  sombraAuth,
  concurrency = 100,
  defaultPhoneCountryCode = '1', // USA
  transcendUrl = DEFAULT_TRANSCEND_API,
  attributes = [],
  emailIsVerified = true,
  skipFilterStep = false,
  skipSendingReceipt = true,
  isTest = false,
  isSilent = true,
  debug = false,
  dryRun = false,
}: {
  /** File to cache metadata about mapping of CSV shape to script */
  cacheFilepath: string;
  /** File where request receipts are stored */
  requestReceiptFolder: string;
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Default country code for phone numbers */
  defaultPhoneCountryCode?: string;
  /** Concurrency to upload in */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Include debug logs */
  debug?: boolean;
  /** Skip the step where requests are filtered */
  skipFilterStep?: boolean;
  /** Whether test requests are being uploaded */
  isTest?: boolean;
  /** Whether requests are uploaded in silent mode */
  isSilent?: boolean;
  /** Whether to send the email receipt */
  skipSendingReceipt?: boolean;
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
  const state = new PersistedState(cacheFilepath, CachedFileState, {
    columnNames: {},
    requestTypeToRequestAction: {},
    subjectTypeToSubjectName: {},
    languageToLocale: {},
    statusToRequestStatus: {},
    identifierNames: {},
    attributeNames: {},
    regionToCountrySubDivision: {},
    regionToCountry: {},
  });

  // Create a new state file to store the requests from this run
  const requestCacheFile = join(
    requestReceiptFolder,
    `tr-request-upload-${new Date().toISOString()}-${file
      .split('/')
      .pop()}`.replace('.csv', '.json'),
  );
  const requestState = new PersistedState(
    requestCacheFile,
    CachedRequestState,
    {
      successfulRequests: [],
      duplicateRequests: [],
      failingRequests: [],
    },
  );

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Read in the list of integration requests
  const requestsList = readCsv(file, t.record(t.string, t.string));
  const columnNames = uniq(requestsList.map((x) => Object.keys(x)).flat());

  // Log out an example request
  if (requestsList.length === 0) {
    throw new Error(
      'No Requests found in list! Ensure the first row of the CSV is a header and the rest are requests.',
    );
  }
  if (debug) {
    const firstRequest = requestsList[0];
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
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  // Grab the request attributes
  const requestAttributeKeys = await fetchAllRequestAttributeKeys(client);
  // Determine the columns that should be mapped
  const columnNameMap = await mapCsvColumnsToApi(columnNames, state);
  const identifierNameMap = await mapColumnsToIdentifiers(
    client,
    columnNames,
    state,
  );
  const attributeNameMap = await mapColumnsToAttributes(
    client,
    columnNames,
    state,
    requestAttributeKeys,
  );
  await mapRequestEnumValues(client, filteredRequestList, {
    state,
    columnNameMap,
  });

  // map the CSV to request input
  const requestInputs = mapCsvRowsToRequestInputs(filteredRequestList, state, {
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
            `[${ind + 1}/${requestInputs.length}] Importing: ${JSON.stringify(
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
            skipSendingReceipt,
            isSilent,
            additionalAttributes: parsedAttributes,
          },
        );

        // Log success
        if (debug) {
          logger.info(
            colors.green(
              `[${ind + 1}/${
                requestInputs.length
              }] Successfully submitted the test data subject request: "${requestLogId}"`,
            ),
          );
          logger.info(
            colors.green(
              `[${ind + 1}/${requestInputs.length}] View it at: "${
                requestResponse.link
              }"`,
            ),
          );
        }

        // Cache successful upload
        const successfulRequests = requestState.getValue('successfulRequests');
        successfulRequests.push({
          id: requestResponse.id,
          link: requestResponse.link,
          rowIndex: ind,
          coreIdentifier: requestResponse.coreIdentifier,
          attemptedAt: new Date().toISOString(),
        });
        await requestState.setValue(successfulRequests, 'successfulRequests');
      } catch (err) {
        const msg = `${err.message} - ${JSON.stringify(
          err.response?.body,
          null,
          2,
        )}`;
        const clientError = extractClientError(msg);

        if (
          clientError === 'Client error: You have already made this request.'
        ) {
          if (debug) {
            logger.info(
              colors.yellow(
                `[${ind + 1}/${
                  requestInputs.length
                }] Skipping request as it is a duplicate`,
              ),
            );
          }
          const duplicateRequests = requestState.getValue('duplicateRequests');
          duplicateRequests.push({
            coreIdentifier: requestInput.coreIdentifier,
            rowIndex: ind,
            attemptedAt: new Date().toISOString(),
          });
          await requestState.setValue(duplicateRequests, 'duplicateRequests');
        } else {
          const failingRequests = requestState.getValue('failingRequests');
          failingRequests.push({
            ...requestInput,
            rowIndex: ind,
            error: clientError || msg,
            attemptedAt: new Date().toISOString(),
          });
          await requestState.setValue(failingRequests, 'failingRequests');
          if (debug) {
            logger.error(colors.red(clientError || msg));
            logger.error(
              colors.red(
                `[${ind + 1}/${
                  requestInputs.length
                }] Failed to submit request for: "${requestLogId}"`,
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
  if (requestState.getValue('duplicateRequests').length > 0) {
    logger.info(
      colors.yellow(
        `Encountered "${
          requestState.getValue('duplicateRequests').length
        }" duplicate requests. ` +
          `See "${requestCacheFile}" to review the core identifiers for these requests.`,
      ),
    );
  }

  // Log errors
  if (requestState.getValue('failingRequests').length > 0) {
    logger.error(
      colors.red(
        `Encountered "${
          requestState.getValue('failingRequests').length
        }" errors. ` +
          `See "${requestCacheFile}" to review the error messages and inputs.`,
      ),
    );
    process.exit(1);
  }
}
/* eslint-enable max-lines */
