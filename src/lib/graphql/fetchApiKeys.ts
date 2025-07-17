import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { difference, keyBy, uniq } from 'lodash-es';
import { TranscendInput } from '../../codecs';
import { logger } from '../../logger';
import { API_KEYS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface ApiKey {
  /** ID of API key */
  id: string;
  /** Title of API key */
  title: string;
}

const PAGE_SIZE = 20;

const ADMIN_LINK = 'https://app.transcend.io/infrastructure/api-keys';

/**
 * Fetch all API keys in an organization
 *
 * @param client - Client
 * @param titles - Filter on titles
 * @returns API keys
 */
export async function fetchAllApiKeys(
  client: GraphQLClient,
  titles?: string[],
): Promise<ApiKey[]> {
  const apiKeys: ApiKey[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      apiKeys: { nodes },
    } = await makeGraphQLRequest<{
      /** API keys */
      apiKeys: {
        /** List */
        nodes: ApiKey[];
      };
    }>(client, API_KEYS, {
      first: PAGE_SIZE,
      offset,
      titles,
    });
    apiKeys.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);
  return apiKeys.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Fetch all apiKeys and if any are found in the config that are
 * missing, create those apiKeys.
 *
 * @param apiKeyInputs - API keys to fetch metadata on
 * @param client - GraphQL client
 * @param fetchAll - When true, fetch all API keys
 * @returns A map from apiKey title to Identifier
 */
export async function fetchApiKeys(
  {
    'api-keys': apiKeyInputs = [],
    'data-silos': dataSilos = [],
  }: TranscendInput,
  client: GraphQLClient,
  fetchAll = false,
): Promise<{ [k in string]: ApiKey }> {
  logger.info(
    colors.magenta(
      `Fetching ${fetchAll ? 'all' : apiKeyInputs.length} API keys...`,
    ),
  );
  const titles = apiKeyInputs.map(({ title }) => title);
  const expectedApiKeyTitles = uniq(
    dataSilos
      .map((silo) => silo['api-key-title'])
      .filter((x): x is string => !!x),
  );
  const allTitlesExpected = [...expectedApiKeyTitles, ...titles];
  const apiKeys = await fetchAllApiKeys(
    client,
    fetchAll ? undefined : [...expectedApiKeyTitles, ...titles],
  );

  // Create a map
  const apiKeysByTitle = keyBy(apiKeys, 'title');

  // Determine expected set of apiKeys expected
  const missingApiKeys = difference(
    allTitlesExpected,
    apiKeys.map(({ title }) => title),
  );

  // If there are missing apiKeys, throw an error
  if (missingApiKeys.length > 0) {
    logger.info(
      colors.red(
        `Failed to find API keys "${missingApiKeys.join(
          '", "',
        )}"! Make sure these API keys are created at: ${ADMIN_LINK}`,
      ),
    );
    process.exit(1);
  }
  return apiKeysByTitle;
}
