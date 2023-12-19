import { GraphQLClient } from 'graphql-request';
import {
  ConsentPrecedenceOption,
  UnknownRequestPolicy,
  UspapiOption,
  TelemetryPartitionStrategy,
  RegionsOperator,
  IsoCountrySubdivisionCode,
  IsoCountryCode,
  BrowserTimeZone,
  SignedIabAgreementOption,
} from '@transcend-io/privacy-types';
import {
  InitialViewState,
  BrowserLanguage,
  OnConsentExpiry,
} from '@transcend-io/airgap.js-types';
import {
  FETCH_CONSENT_MANAGER_ID,
  FETCH_CONSENT_MANAGER,
  EXPERIENCES,
  PURPOSES,
  CONSENT_MANAGER_ANALYTICS_DATA,
  FETCH_CONSENT_MANAGER_THEME,
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
  /** When using a custom partition, this is the partition value */
  partition?: {
    /** Partition value */
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
  /** Experience display name */
  displayName?: string;
  /** Region that define this regional experience */
  regions: {
    /** Sub division */
    countrySubDivision?: IsoCountrySubdivisionCode;
    /** Country */
    country?: IsoCountryCode;
  }[];
  /** In vs not in operator */
  operator: RegionsOperator;
  /** Priority of experience */
  displayPriority: number;
  /** View state to prompt when auto prompting is enabled */
  viewState: InitialViewState;
  /** Consent expiry setting */
  onConsentExpiry: OnConsentExpiry;
  /** Purposes that can be opted out of in a particular experience */
  purposes: {
    /** Name of purpose */
    name: string;
  }[];
  /** Purposes that are opted out by default in a particular experience */
  optedOutPurposes: {
    /** Name of purpose */
    name: string;
  }[];
  /**
   * Browser languages that define this regional experience
   */
  browserLanguages: BrowserLanguage[];
  /** Browser time zones that define this regional experience */
  browserTimeZones: BrowserTimeZone[];
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

  // Fetch all experiences
  let shouldContinue = false;
  do {
    const {
      experiences: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Consent experience */
      experiences: {
        /** List */
        nodes: ConsentExperience[];
      };
    }>(client, EXPERIENCES, {
      first: PAGE_SIZE,
      offset,
    });
    experiences.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return experiences.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The allowed bin sizes for pulling consent metrics
 */
export enum ConsentManagerMetricBin {
  Hourly = '1h',
  Daily = '1d',
}

export interface ConsentManagerMetric {
  /** Name of metric */
  name: string;
  /** The metrics */
  points: {
    /** Key of metric */
    key: string;
    /** Value of metric */
    value: string;
  }[];
}

/**
 * Fetch consent manager analytics data
 *
 * @param client - GraphQL client
 * @param input - Input for fetching data
 * @returns Consent manager purposes in the organization
 */
export async function fetchConsentManagerAnalyticsData(
  client: GraphQLClient,
  input: {
    /** Data source */
    dataSource:
      | 'PRIVACY_SIGNAL_TIMESERIES'
      | 'CONSENT_CHANGES_TIMESERIES'
      | 'CONSENT_SESSIONS_BY_REGIME';
    /** Start date, in ISO string format */
    startDate: string;
    /** End date, in ISO string format */
    endDate: string;
    /** Force refetching */
    forceRefetch?: boolean;
    /** Airgap bundle ID */
    airgapBundleId: string;
    /** Bin interval */
    binInterval: ConsentManagerMetricBin;
    /** Whether or not to smooth the time series */
    smoothTimeseries: false;
  },
): Promise<ConsentManagerMetric[]> {
  const {
    analyticsData: { series },
  } = await makeGraphQLRequest<{
    /** Analytics data response */
    analyticsData: {
      /** Consent manager metrics */
      series: ConsentManagerMetric[];
    };
  }>(client, CONSENT_MANAGER_ANALYTICS_DATA, {
    input,
  });
  return series;
}

export interface ConsentManagerTheme {
  /** Primary color */
  primaryColor: string;
  /** Font color */
  fontColor: string;
  /** Privacy policy URL */
  privacyPolicy?: string;
  /** Auto-prompt setting */
  prompt: number;
}

/**
 * Fetch consent manager theme
 *
 * @param client - GraphQL client
 * @param airgapBundleId - Airgap bundle ID to fetch for
 * @returns Consent manager ID in organization
 */
export async function fetchConsentManagerTheme(
  client: GraphQLClient,
  airgapBundleId: string,
): Promise<ConsentManagerTheme> {
  const {
    consentManagerTheme: { theme },
  } = await makeGraphQLRequest<{
    /** Consent manager query */
    consentManagerTheme: {
      /** Consent manager object */
      theme: ConsentManagerTheme;
    };
  }>(client, FETCH_CONSENT_MANAGER_THEME, {
    airgapBundleId,
  });
  return theme;
}
