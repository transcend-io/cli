import { GraphQLClient } from 'graphql-request';
import { IdentifierType, RequestAction } from '@transcend-io/privacy-types';
import { CREATE_IDENTIFIER, IDENTIFIERS, NEW_IDENTIFIER_TYPES } from './gqls';
import keyBy from 'lodash/keyBy';
import uniq from 'lodash/uniq';
import flatten from 'lodash/flatten';
import { TranscendInput } from '../../codecs';
import difference from 'lodash/difference';
import { logger } from '../../logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Identifier {
  /** ID of identifier */
  id: string;
  /** Name of identifier */
  name: string;
  /** The type of identifier */
  type: IdentifierType;
  /** Regular expression to  */
  regex: string;
  /** The set of options that the identifier  */
  selectOptions: string[];
  /** Whether identifier is enabled on privacy center */
  privacyCenterVisibility: RequestAction[];
  /** Enabled data subjects that are exposed this identifier on the privacy center */
  dataSubjects: {
    /** type of data subjects */
    type: string;
  }[];
  /** Whether identifier is a required field in privacy center form */
  isRequiredInForm: boolean;
  /** Identifier placeholder text */
  placeholder: string;
  /** Display title for identifier */
  displayTitle: {
    /** Default message */
    defaultMessage: string;
  };
  /** Display description for identifier */
  displayDescription: {
    /** Default */
    defaultMessage: string;
  };
  /** Display order */
  displayOrder: number;
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

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      identifiers: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Identifiers */
      identifiers: {
        /** List */
        nodes: Identifier[];
      };
    }>(client, IDENTIFIERS, {
      first: PAGE_SIZE,
      offset,
    });
    identifiers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return identifiers.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch all identifiers and if any are found in the config that are
 * missing, create those identifiers.
 *
 * @param input - Transcend input
 * @param client - GraphQL client
 * @param skipPublish - When true, skip publishing to privacy center
 * @returns A map from identifier name to Identifier
 */
export async function fetchIdentifiersAndCreateMissing(
  {
    enrichers = [],
    'data-silos': dataSilos = [],
    identifiers = [],
  }: TranscendInput,
  client: GraphQLClient,
  skipPublish = false,
): Promise<{ [k in string]: Identifier }> {
  // Grab all existing identifiers
  const allIdentifiers = await fetchAllIdentifiers(client);

  // Create a map
  const identifiersByName = keyBy(allIdentifiers, 'name');

  // Determine expected set of identifiers
  const expectedIdentifiers = uniq([
    ...flatten(
      enrichers.map((enricher) => [
        enricher['input-identifier'],
        ...enricher['output-identifiers'],
      ]),
    ),
    ...flatten(dataSilos.map((dataSilo) => dataSilo['identity-keys'])),
    ...identifiers.map(({ name }) => name),
  ]).filter((x) => !!x);
  const missingIdentifiers = difference(
    expectedIdentifiers,
    allIdentifiers.map(({ name }) => name),
  );

  // If there are missing identifiers, create new ones
  if (missingIdentifiers.length > 0) {
    logger.info(
      colors.magenta(
        `Creating ${missingIdentifiers.length} new identifiers...`,
      ),
    );
    const { newIdentifierTypes } = await makeGraphQLRequest<{
      /** Query response */
      newIdentifierTypes: {
        /** Name of identifier type remaining */
        name: string;
      }[];
    }>(client, NEW_IDENTIFIER_TYPES);
    const nativeTypesRemaining = newIdentifierTypes.map(({ name }) => name);
    await mapSeries(missingIdentifiers, async (identifier) => {
      logger.info(colors.magenta(`Creating identifier ${identifier}...`));
      const { createIdentifier } = await makeGraphQLRequest<{
        /** createIdentifier Response */
        createIdentifier: {
          /** Created identifier */
          identifier: Identifier;
        };
      }>(client, CREATE_IDENTIFIER, {
        input: {
          name: identifier,
          type: nativeTypesRemaining.includes(identifier!)
            ? identifier
            : 'custom',
          skipPublish,
        },
      });
      logger.info(colors.green(`Created identifier ${identifier}!`));

      identifiersByName[identifier!] = createIdentifier.identifier;
    });
  }
  return identifiersByName;
}
