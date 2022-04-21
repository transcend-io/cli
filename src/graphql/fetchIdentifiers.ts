import { GraphQLClient } from 'graphql-request';
import { CREATE_IDENTIFIER, IDENTIFIERS, NEW_IDENTIFIER_TYPES } from './gqls';
import keyBy from 'lodash/keyBy';
import uniq from 'lodash/uniq';
import flatten from 'lodash/flatten';
import { TranscendInput } from '../codecs';
import difference from 'lodash/difference';
import { logger } from '../logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';

export interface Identifier {
  /** ID of identifier */
  id: string;
  /** Name of identifier */
  name: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all identifiers in the organization
 *
 * @param client - GraphQL client
 * @returns All identifiers in the organization
 */
export async function fetchAllIdentifiers(
  client: GraphQLClient,
): Promise<Identifier[]> {
  const identifiers: Identifier[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      identifiers: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await client.request(IDENTIFIERS, {
      first: PAGE_SIZE,
      offset,
    });
    identifiers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return identifiers;
}

/**
 * Fetch all identifiers and if any are found in the config that are
 * missing, create those identifiers.
 *
 * @param input - Transcend input
 * @param client - GraphQL client
 * @returns A map from identifier name to Identifier
 */
export async function fetchIdentifiersAndCreateMissing(
  { enrichers = [], 'data-silos': dataSilos = [] }: TranscendInput,
  client: GraphQLClient,
): Promise<{ [k in string]: Identifier }> {
  // Grab all existing identifiers
  const identifiers = await fetchAllIdentifiers(client);

  // Create a map
  const identifiersByName = keyBy(identifiers, 'name');

  // Determine expected set of identifiers
  const expectedIdentifiers = uniq([
    ...flatten(
      enrichers.map((enricher) => [
        enricher['input-identifier'],
        ...enricher['output-identifiers'],
      ]),
    ),
    ...flatten(dataSilos.map((dataSilo) => dataSilo['identity-keys'])),
  ]).filter((x) => !!x);
  const missingIdentifiers = difference(
    expectedIdentifiers,
    identifiers.map(({ name }) => name),
  );

  // If there are missing identifiers, create new ones
  if (missingIdentifiers.length > 0) {
    logger.info(
      colors.magenta(
        `Creating ${missingIdentifiers.length} new identifiers...`,
      ),
    );
    const { newIdentifierTypes } = await client.request<{
      /** Query response */
      newIdentifierTypes: {
        /** Name of identifier type remaining */
        name: string;
      }[];
    }>(NEW_IDENTIFIER_TYPES);
    const nativeTypesRemaining = newIdentifierTypes.map(({ name }) => name);
    await mapSeries(missingIdentifiers, async (identifier) => {
      logger.info(colors.magenta(`Creating identifier ${identifier}...`));
      const { createIdentifier } = await client.request(CREATE_IDENTIFIER, {
        name: identifier,
        type: nativeTypesRemaining.includes(identifier!)
          ? identifier
          : 'custom',
      });
      logger.info(colors.green(`Created identifier ${identifier}!`));

      identifiersByName[identifier!] = createIdentifier.identifier;
    });
  }
  return identifiersByName;
}
