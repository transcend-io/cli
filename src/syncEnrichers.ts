import { EnricherInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { ENRICHERS, CREATE_ENRICHER, UPDATE_ENRICHER } from './gqls';
import { RequestAction } from '@transcend-io/privacy-types';
import { Identifier } from './fetchIdentifiers';

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
  const {
    enrichers: { nodes: matches },
  } = await client.request<{
    /** Query response */
    enrichers: {
      /** List of matches */
      nodes: {
        /** ID of enricher */
        id: string;
        /** Title of enricher */
        title: string;
        /** Input identifier */
        inputIdentifier: {
          /** Identifier name */
          name: string;
        };
        /** Output identifiers */
        identifiers: {
          /** Identifier name */
          name: string;
        };
      }[];
    };
  }>(ENRICHERS, {
    title: enricher.title,
  });
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
