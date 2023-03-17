import { GraphQLClient } from 'graphql-request';
import { DATA_FLOWS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchConsentManagerId } from './fetchConsentManagerId';

export interface Cookie {
  id: string;
  name: string;
  isRegex: boolean;
  description: string;
  trackingPurposes: string[];
  service: {
    integrationName: string;
  };
  source: string; // FIXME
  status: string; //FIXME
  owners: {
    email: string;
  }[];
  teams: {
    name: string;
  }[];
  attributeValues: {
    name: string;
    attributeKey: {
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all Cookies in the organization
 *
 * @param client - GraphQL client
 * @returns All Cookies in the organization
 */
export async function fetchAllCookies(
  client: GraphQLClient,
): Promise<Cookie[]> {
  const cookies: Cookie[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client);

  // Try to fetch an Cookies with the same title
  let shouldContinue = false;
  do {
    const {
      cookies: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Query response */
      cookies: {
        /** List of matches */
        nodes: Cookie[];
      };
    }>(client, DATA_FLOWS, {
      first: PAGE_SIZE,
      offset,
      airgapBundleId,
      status: 'LIVE', // FIXME
    });
    cookies.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return cookies;
}
