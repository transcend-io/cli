import { GraphQLClient } from 'graphql-request';
import { COOKIES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchConsentManagerId } from './fetchConsentManagerId';
import {
  ConsentTrackerSource,
  ConsentTrackerStatus,
} from '@transcend-io/privacy-types';

export interface Cookie {
  /** ID of the cookie */
  id: string;
  /** Name of the cookie */
  name: string;
  /** Whether cookie is a regular express */
  isRegex: boolean;
  /** Description of cookie */
  description: string;
  /** Enabled tracking purposes for the cookie */
  trackingPurposes: string[];
  /** The consent service */
  service: {
    /** Integration name of service */
    integrationName: string;
  };
  /** Source of how tracker was added */
  source: ConsentTrackerSource;
  /** Status of cookie labeling */
  status: ConsentTrackerStatus;
  /** Owners of that cookie */
  owners: {
    /** Email address of owner */
    email: string;
  }[];
  /** Teams assigned to that cookie */
  teams: {
    /** Name of team */
    name: string;
  }[];
  /** Attributes assigned to that cookie */
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
 * Fetch all Cookies in the organization
 *
 * @param client - GraphQL client
 * @param status - The status to fetch
 * @returns All Cookies in the organization
 */
export async function fetchAllCookies(
  client: GraphQLClient,
  status = ConsentTrackerStatus.Live,
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
    }>(client, COOKIES, {
      first: PAGE_SIZE,
      offset,
      airgapBundleId,
      status,
    });
    cookies.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return cookies;
}
