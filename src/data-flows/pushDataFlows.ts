import type { GraphQLClient } from 'graphql-request';
import * as t from 'io-ts';
import {
  makeGraphQLRequest,
  FETCH_CONSENT_MANAGER,
  CREATE_DATA_FLOWS,
} from '../graphql';
import { splitCsvToList } from '../requests';

/** Data flow import */
export const DataFlowRow = t.type({
  Host: t.string,
  Purposes: t.string,
});

/** Type override */
export type DataFlowRow = t.TypeOf<typeof DataFlowRow>;

/**
 * Push a data flow to Transcend
 *
 * @param client - GraphQL client
 * @param dataFlows - Data flow configurations
 */
export async function pushDataFlows(
  client: GraphQLClient,
  dataFlows: DataFlowRow[],
): Promise<void> {
  const {
    consentManager: { consentManager },
  } = await makeGraphQLRequest<{
    /** Consent manager query */
    consentManager: {
      /** Consent manager object */
      consentManager: {
        /** ID of bundle */
        id: string;
      };
    };
  }>(client, FETCH_CONSENT_MANAGER);
  await makeGraphQLRequest(client, CREATE_DATA_FLOWS, {
    dataFlows: dataFlows.map((flow) => ({
      value: flow.Host,
      type: 'HOST',
      trackingType: splitCsvToList(flow.Purposes),
    })),
    airgapBundleId: consentManager.id,
  });
}
