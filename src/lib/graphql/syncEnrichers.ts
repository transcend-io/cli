import { EnricherInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import { ENRICHERS, CREATE_ENRICHER, UPDATE_ENRICHER } from './gqls';
import {
  EnricherType,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  PreflightRequestStatus,
  RequestAction,
} from '@transcend-io/privacy-types';
import { Identifier } from './fetchIdentifiers';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { DataSubject } from './fetchDataSubjects';

export interface Enricher {
  /** ID of enricher */
  id: string;
  /** Title of enricher */
  title: string;
  /** URL of enricher */
  url: string;
  /** Server silo */
  type: EnricherType;
  /** Input identifier */
  inputIdentifier: {
    /** Identifier name */
    name: string;
  };
  /** The selected actions */
  actions: RequestAction[];
  /** Output identifiers */
  identifiers: {
    /** Identifier name */
    name: string;
  }[];
  /** Data subjects that the preflight check is configured for */
  dataSubjects: {
    /** Data subject type */
    type: string;
  }[];
  /** The duration (in ms) that the enricher should take to execute. - BigInt */
  expirationDuration: string;
  /** Looker query title */
  lookerQueryTitle?: string;
  /** A regular expression that can be used to match on for cancelation */
  testRegex?: string;
  /** The status that the enricher should transfer to when condition is met. */
  transitionRequestStatus?: PreflightRequestStatus;
  /** The twilio phone number to send from */
  phoneNumbers: string[];
  /**
   * The list of regions that should trigger the enrichment condition
   */
  regionList: (IsoCountryCode | IsoCountrySubdivisionCode)[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all enrichers in the organization
 *
 * @param client - GraphQL client
 * @param title - Filter by title
 * @returns All enrichers in the organization
 */
export async function fetchAllEnrichers(
  client: GraphQLClient,
  title?: string,
): Promise<Enricher[]> {
  const enrichers: Enricher[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      enrichers: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      enrichers: {
        /** List of matches */
        nodes: Enricher[];
      };
    }>(client, ENRICHERS, {
      first: PAGE_SIZE,
      offset,
      title,
    });
    enrichers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return enrichers.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Sync an enricher configuration
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncEnricher(
  client: GraphQLClient,
  {
    enricher,
    identifierByName,
    dataSubjectsByName,
  }: {
    /** The enricher input */
    enricher: EnricherInput;
    /** Index of identifiers in the organization */
    identifierByName: { [name in string]: Identifier };
    /** Lookup data subject by name */
    dataSubjectsByName: { [name in string]: DataSubject };
  },
): Promise<void> {
  // Whether to continue looping
  const matches = await fetchAllEnrichers(client, enricher.title);
  const existingEnricher = matches.find(
    ({ title }) => title === enricher.title,
  );

  // Map to data subject Ids
  const dataSubjectIds = enricher['data-subjects']?.map((subject) => {
    const existing = dataSubjectsByName[subject];
    if (!existing) {
      throw new Error(`Failed to find a data subject with name: ${subject}`);
    }
    return existing.id;
  });

  // If enricher exists, update it, else create new
  const inputIdentifier = enricher['input-identifier'];
  const actionUpdates =
    enricher['privacy-actions'] || Object.values(RequestAction);
  if (existingEnricher) {
    await makeGraphQLRequest(client, UPDATE_ENRICHER, {
      input: {
        id: existingEnricher.id,
        title: enricher.title,
        url: enricher.url,
        headers: enricher.headers,
        testRegex: enricher.testRegex,
        lookerQueryTitle: enricher.lookerQueryTitle,
        expirationDuration:
          typeof enricher.expirationDuration === 'number'
            ? enricher.expirationDuration.toString()
            : undefined,
        transitionRequestStatus: enricher.transitionRequestStatus,
        phoneNumbers: enricher.phoneNumbers,
        regionList: enricher.regionList,
        dataSubjectIds,
        description: enricher.description || '',
        inputIdentifier: inputIdentifier
          ? identifierByName[inputIdentifier].id
          : undefined,
        identifiers: enricher['output-identifiers'].map(
          (id) => identifierByName[id].id,
        ),
        ...(existingEnricher.type === EnricherType.Sombra
          ? {}
          : { actions: actionUpdates }),
      },
    });
  } else if (inputIdentifier) {
    await makeGraphQLRequest(client, CREATE_ENRICHER, {
      input: {
        title: enricher.title,
        url: enricher.url,
        type: enricher.type || EnricherType.Server,
        headers: enricher.headers,
        testRegex: enricher.testRegex,
        lookerQueryTitle: enricher.lookerQueryTitle,
        expirationDuration:
          typeof enricher.expirationDuration === 'number'
            ? enricher.expirationDuration.toString()
            : undefined,
        transitionRequestStatus: enricher.transitionRequestStatus,
        phoneNumbers: enricher.phoneNumbers,
        dataSubjectIds,
        regionList: enricher.regionList,
        description: enricher.description || '',
        inputIdentifier: identifierByName[inputIdentifier].id,
        identifiers: enricher['output-identifiers'].map(
          (id) => identifierByName[id].id,
        ),
        actions: actionUpdates,
      },
    });
  }
}
