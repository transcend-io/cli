import { GraphQLClient } from 'graphql-request';
import { DATA_FLOWS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchConsentManagerId } from './fetchConsentManagerId';
import {
  DataFlowScope,
  ConsentTrackerSource,
  ConsentTrackerStatus,
} from '@transcend-io/privacy-types';

export interface DataFlow {
  /** ID of data flow */
  id: string;
  /** Value of data flow */
  value: string;
  /** Type of data flow */
  type: DataFlowScope;
  /** Description of data flow */
  description: string;
  /** Enabled tracking purposes */
  trackingType: string[];
  /** The consent service */
  service: {
    /** Integration name of service */
    integrationName: string;
  };
  /** Source of how tracker was added */
  source: ConsentTrackerSource;
  /** Status of data flow labeling */
  status: ConsentTrackerStatus;
  /** Owners of that data flow */
  owners: {
    /** Email address of owner */
    email: string;
  }[];
  /** Teams assigned to that data flow */
  teams: {
    /** Name of team */
    name: string;
  }[];
  /** Attributes assigned to that data flow */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key that the value represents */
    attributeKey: {
      /** Name of attribute team */
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all DataFlows in the organization
 *
 * @param client - GraphQL client
 * @param status - The status to fetch
 * @returns All DataFlows in the organization
 */
export async function fetchAllDataFlows(
  client: GraphQLClient,
  status = ConsentTrackerStatus.Live,
): Promise<DataFlow[]> {
  const dataFlows: DataFlow[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client);

  // Try to fetch an DataFlow with the same title
  let shouldContinue = false;
  do {
    const {
      dataFlows: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Query response */
      dataFlows: {
        /** List of matches */
        nodes: DataFlow[];
      };
    }>(client, DATA_FLOWS, {
      first: PAGE_SIZE,
      offset,
      airgapBundleId,
      status,
      ...(status === ConsentTrackerStatus.NeedsReview
        ? { showZeroActivity: true }
        : {}),
    });
    dataFlows.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return dataFlows;
}
