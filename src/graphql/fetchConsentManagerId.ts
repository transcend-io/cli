import { GraphQLClient } from 'graphql-request';
import { FETCH_CONSENT_MANAGER } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Fetch consent manager ID
 *
 * @returns Consent manager ID in organization
 */
export async function fetchConsentManagerId(
  client: GraphQLClient,
): Promise<string> {
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
  return consentManager.id;
}
