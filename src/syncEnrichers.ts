import { EnricherInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { ENRICHERS, CREATE_ENRICHER, UPDATE_ENRICHER } from './gqls';
import { RequestAction } from '@transcend-io/privacy-types';
import { Identifier } from './fetchIdentifiers';

export interface Enricher {
  /** ID of enricher */
  id: string;
  /** Title of enricher */
  title: string;
  /** URL of enricher */
  url: string;
  /** Server silo */
  type: 'SERVER' | 'PERSON';
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

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      enrichers: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await client.request<{
      /** Query response */
      enrichers: {
        /** List of matches */
        nodes: Enricher[];
      };
    }>(ENRICHERS, {
      first: PAGE_SIZE,
      offset,
      title,
    });
    enrichers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return enrichers;
}

/**
 * Sync an enricher configuration
 *
 * @param enricher - The enricher input
 * @param client - GraphQL client
 * @param identifiersByName - Index of identifiers in the organization
 */
export async function syncEnricher(
  enricher: EnricherInput,
  client: GraphQLClient,
  identifiersByName: { [name in string]: Identifier },
): Promise<void> {
  // Try to fetch an enricher with the same title
  const matches = await fetchAllEnrichers(client, enricher.title);
  const existingEnricher = matches.find(
    ({ title }) => title === enricher.title,
  );

  // If enricher exists, update it, else create new
  if (existingEnricher) {
    await client.request(UPDATE_ENRICHER, {
      id: existingEnricher.id,
      title: enricher.title,
      url: enricher.url,
      description: enricher.description || '',
      inputIdentifier: identifiersByName[enricher['input-identifier']].id,
      identifiers: enricher['output-identifiers'].map(
        (id) => identifiersByName[id].id,
      ),
      actions: enricher['privacy-actions'] || Object.values(RequestAction),
    });
  } else {
    await client.request(CREATE_ENRICHER, {
      title: enricher.title,
      url: enricher.url,
      description: enricher.description || '',
      inputIdentifier: identifiersByName[enricher['input-identifier']].id,
      identifiers: enricher['output-identifiers'].map(
        (id) => identifiersByName[id].id,
      ),
      actions: enricher['privacy-actions'] || Object.values(RequestAction),
    });
  }
}
