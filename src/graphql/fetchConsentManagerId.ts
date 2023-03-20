import { GraphQLClient } from 'graphql-request';
import {
  FETCH_CONSENT_MANAGER_ID,
  FETCH_CONSENT_MANAGER,
  PURPOSES,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface ConsentManager {
  /** ID of consent manager */
  id: string;
  /** Configuration of consent manager */
  configuration: {
    /** Domain list */
    domains: string[];
  };
}

/**
 * Fetch consent manager ID
 *
 * @param client - GraphQL client
 * @returns Consent manager ID in organization
 */
export async function fetchConsentManager(
  client: GraphQLClient,
): Promise<ConsentManager> {
  const {
    consentManager: { consentManager },
  } = await makeGraphQLRequest<{
    /** Consent manager query */
    consentManager: {
      /** Consent manager object */
      consentManager: ConsentManager;
    };
  }>(client, FETCH_CONSENT_MANAGER);
  return consentManager;
}

/**
 * Fetch consent manager ID
 *
 * @param client - GraphQL client
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
  }>(client, FETCH_CONSENT_MANAGER_ID);
  return consentManager.id;
}

export interface ConsentPurpose {
  /** ID of purpose */
  id: string;
  /** Name of purpose */
  name: string;
}

/**
 * Fetch consent manager ID
 *
 * @param client - GraphQL client
 * @returns Consent manager ID in organization
 */
export async function fetchPurposes(
  client: GraphQLClient,
): Promise<ConsentPurpose[]> {
  const {
    purposes: { purposes },
  } = await makeGraphQLRequest<{
    /** Consent manager query */
    purposes: {
      /** Consent manager object */
      purposes: ConsentPurpose[];
    };
  }>(client, PURPOSES);
  return purposes;
}
