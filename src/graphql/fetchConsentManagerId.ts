import { GraphQLClient } from 'graphql-request';
import {
  ConsentPrecedenceOption,
  UnknownRequestPolicy,
  UspapiOption,
  TelemetryPartitionStrategy,
  SignedIabAgreementOption,
} from '@transcend-io/privacy-types';
import {
  FETCH_CONSENT_MANAGER_ID,
  FETCH_CONSENT_MANAGER,
  EXPERIENCES,
  PURPOSES,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface ConsentManager {
  /** ID of consent manager */
  id: string;
  /** Production bundle URL */
  bundleURL: string;
  /** Test bundle URL */
  testBundleURL: string;
  /** Configuration of consent manager */
  configuration: {
    /** Domain list */
    domains: string[];
    /** Consent precedence of user vs signal */
    consentPrecedence: ConsentPrecedenceOption;
    /** Unknown request policy */
    unknownRequestPolicy: UnknownRequestPolicy;
    /** Unknown cookie policy */
    unknownCookiePolicy: UnknownRequestPolicy;
    /** Sync endpoint */
    syncEndpoint: string;
    /** Telemetry partitioning */
    telemetryPartitioning: TelemetryPartitionStrategy;
    /** Signed IAB agreement */
    signedIabAgreement: SignedIabAgreementOption;
    /** USP API support */
    uspapi: UspapiOption;
    /** Sync groups */
    syncGroups: string;
    /** Partition parameter */
    partition: string;
  };
}

/**
 * Fetch consent manager
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
 * @param maxRequests - = Max number of requests to send
 * @returns Consent manager ID in organization
 */
export async function fetchConsentManagerId(
  client: GraphQLClient,
  maxRequests?: number,
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
  }>(client, FETCH_CONSENT_MANAGER_ID, {}, {}, maxRequests);
  return consentManager.id;
}

export interface ConsentPurpose {
  /** ID of purpose */
  id: string;
  /** Name of purpose */
  name: string;
}

/**
 * Fetch consent manager purposes
 *
 * @param client - GraphQL client
 * @returns Consent manager purposes in the organization
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

const PAGE_SIZE = 50;

export interface ConsentExperience {
  /** ID of experience */
  id: string;
  /** Name of experience */
  name: string;
}

/**
 * Fetch consent manager experiences
 *
 * @param client - GraphQL client
 * @returns Consent manager experiences in the organization
 */
export async function fetchConsentManagerExperiences(
  client: GraphQLClient,
): Promise<ConsentExperience[]> {
  const experiences: ConsentExperience[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      experiences: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest(client, EXPERIENCES, {
      first: PAGE_SIZE,
      offset,
    });
    experiences.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return experiences;
}
