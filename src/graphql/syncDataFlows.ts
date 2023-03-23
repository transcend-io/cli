import { GraphQLClient } from 'graphql-request';
import { CREATE_DATA_FLOWS, UPDATE_DATA_FLOWS } from './gqls';
import chunk from 'lodash/chunk';
import { mapSeries } from 'bluebird';
import { DataFlowInput } from '../codecs';
// import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchConsentManagerId } from './fetchConsentManagerId';

const MAX_PAGE_SIZE = 100;

/**
 * Update data flows that already existed
 *
 * @param client - GraphQL client
 * @param dataFlowInputs - [DataFlowInput, Data Flow ID] mappings to update
 */
export async function updateDataFlows(
  client: GraphQLClient,
  dataFlowInputs: [DataFlowInput, string][],
): Promise<void> {
  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchPurposes(client);
  // const purposeNameToId = keyBy(purposes, 'name');

  await mapSeries(chunk(dataFlowInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_DATA_FLOWS, {
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
    });
  });
}

/**
 * Create new data flows
 *
 * @param client - GraphQL client
 * @param dataFlowInputs - List of data flows to create
 */
export async function createDataFlows(
  client: GraphQLClient,
  dataFlowInputs: DataFlowInput[],
): Promise<void> {
  const airgapBundleId = await fetchConsentManagerId(client);
  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchPurposes(client);
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
    });
  });
}
