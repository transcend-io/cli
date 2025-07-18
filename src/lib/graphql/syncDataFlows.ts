import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';
import { DataFlowInput } from '../../codecs';
import { logger } from '../../logger';
import { mapSeries } from '../bluebird-replace';
import { fetchAllDataFlows } from './fetchAllDataFlows';
import { fetchConsentManagerId } from './fetchConsentManagerId';
import { CREATE_DATA_FLOWS, UPDATE_DATA_FLOWS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

const MAX_PAGE_SIZE = 100;

/**
 * Update data flows that already existed
 *
 * @param client - GraphQL client
 * @param dataFlowInputs - [DataFlowInput, Data Flow ID] mappings to update
 * @param classifyService - classify service if missing
 */
export async function updateDataFlows(
  client: GraphQLClient,
  dataFlowInputs: [DataFlowInput, string][],
  classifyService = false,
): Promise<void> {
  const airgapBundleId = await fetchConsentManagerId(client);

  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchAllPurposes(client);
  // const purposeNameToId = keyBy(purposes, 'name');

  await mapSeries(chunk(dataFlowInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_DATA_FLOWS, {
      airgapBundleId,
      dataFlows: page.map(([flow, id]) => ({
        id,
        value: flow.value,
        type: flow.type,
        trackingType:
          flow.trackingPurposes && flow.trackingPurposes.length > 0
            ? flow.trackingPurposes
            : undefined,
        // TODO: https://transcend.height.app/T-19841 - add with custom purposes
        // purposeIds: flow.trackingPurposes
        //   ? flow.trackingPurposes
        //       .filter((purpose) => purpose !== 'Unknown')
        //       .map((purpose) => purposeNameToId[purpose].id)
        // : undefined,
        description: flow.description,
        service: flow.service,
        status: flow.status,
        attributes: flow.attributes,
        // TODO: https://transcend.height.app/T-23718
        // owners,
        // teams,
      })),
      classifyService,
    });
  });
}

/**
 * Create new data flows
 *
 * @param client - GraphQL client
 * @param dataFlowInputs - List of data flows to create
 * @param classifyService - classify service if missing
 */
export async function createDataFlows(
  client: GraphQLClient,
  dataFlowInputs: DataFlowInput[],
  classifyService = false,
): Promise<void> {
  const airgapBundleId = await fetchConsentManagerId(client);
  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchAllPurposes(client);
  // const purposeNameToId = keyBy(purposes, 'name');
  await mapSeries(chunk(dataFlowInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, CREATE_DATA_FLOWS, {
      airgapBundleId,
      dataFlows: page.map((flow) => ({
        value: flow.value,
        type: flow.type,
        trackingType:
          flow.trackingPurposes && flow.trackingPurposes.length > 0
            ? flow.trackingPurposes
            : undefined,
        // TODO: https://transcend.height.app/T-19841 - add with custom purposes
        // purposeIds: flow.trackingPurposes
        //   ? flow.trackingPurposes
        //       .filter((purpose) => purpose !== 'Unknown')
        //       .map((purpose) => purposeNameToId[purpose].id)
        //   : undefined,
        description: flow.description,
        service: flow.service,
        status: flow.status,
        attributes: flow.attributes,
        // TODO: https://transcend.height.app/T-23718
        // owners,
        // teams,
      })),
      dropMatchingDataFlowsInTriage: true,
      classifyService,
    });
  });
}

/**
 * Sync data flow configurations into Transcend
 *
 * @param client - GraphQL client
 * @param dataFlows - The data flows to upload
 * @param classifyService - When true, auto classify the service based on the data flow value
 * @returns True if the command ran successfully, returns false if an error occurred
 */
export async function syncDataFlows(
  client: GraphQLClient,
  dataFlows: DataFlowInput[],
  classifyService: boolean,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${dataFlows.length}" data flows...`));

  // Ensure no duplicates are being uploaded
  // De-dupe the data flows based on [value, type]
  const notUnique = dataFlows.filter(
    (dataFlow) =>
      dataFlows.filter(
        (flow) => dataFlow.value === flow.value && dataFlow.type === flow.type,
      ).length > 1,
  );

  // Throw error to prompt user to de-dupe before uploading
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload data flows as there were non-unique entries found: ${notUnique
        .map(({ value }) => value)
        .join(',')}`,
    );
  }

  // Fetch existing data flows to determine whether we are creating a new data flow
  // or updating an existing data flow
  logger.info(colors.magenta('Fetching data flows...'));
  const [existingLiveDataFlows, existingInReviewDataFlows] = await Promise.all([
    fetchAllDataFlows(client, ConsentTrackerStatus.Live),
    fetchAllDataFlows(client, ConsentTrackerStatus.NeedsReview),
  ]);
  const allDataFlows = [...existingLiveDataFlows, ...existingInReviewDataFlows];

  // Determine which data flows are new vs existing
  const mapDataFlowsToExisting = dataFlows.map((dataFlow) => [
    dataFlow,
    allDataFlows.find(
      (flow) => dataFlow.value === flow.value && dataFlow.type === flow.type,
    )?.id,
  ]);

  // Create the new data flows
  const newDataFlows = mapDataFlowsToExisting
    .filter(([, existing]) => !existing)
    .map(([flow]) => flow as DataFlowInput);
  try {
    logger.info(
      colors.magenta(`Creating "${newDataFlows.length}" new data flows...`),
    );
    await createDataFlows(client, newDataFlows, classifyService);
    logger.info(
      colors.green(`Successfully synced ${newDataFlows.length} data flows!`),
    );
  } catch (error) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create data flows! - ${error.message}`));
  }

  // Update existing data flows
  const existingDataFlows = mapDataFlowsToExisting.filter(
    (x): x is [DataFlowInput, string] => !!x[1],
  );
  try {
    logger.info(
      colors.magenta(`Updating "${existingDataFlows.length}" data flows...`),
    );
    await updateDataFlows(client, existingDataFlows, classifyService);
    logger.info(
      colors.green(
        `Successfully updated "${existingDataFlows.length}" data flows!`,
      ),
    );
  } catch (error) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create data flows! - ${error.message}`));
  }

  logger.info(colors.green(`Synced "${dataFlows.length}" data flows!`));

  // Return true upon success
  return !encounteredError;
}
