import { GraphQLClient } from 'graphql-request';
import { API_KEYS } from './gqls';
import keyBy from 'lodash/keyBy';
import uniq from 'lodash/uniq';
import difference from 'lodash/difference';
import { logger } from '../logger';
import colors from 'colors';
import { TranscendInput } from '../codecs';

export interface ApiKey {
  /** ID of APi key */
  id: string;
  /** Title of API key */
  title: string;
}

const PAGE_SIZE = 20;

const ADMIN_LINK = 'https://app.transcend.io/infrastructure/api-keys';

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
  const apiKeys: ApiKey[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      apiKeys: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await client.request(API_KEYS, {
      first: PAGE_SIZE,
      offset,
      titles: fetchAll ? undefined : titles,
    });
    apiKeys.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  // Create a map
  const apiKeysByTitle = keyBy(apiKeys, 'title');

  // Determine expected set of apiKeys expected
  const expectedApiKeyTitles = uniq(
    dataSilos.map((silo) => silo['api-key-title']).filter((x) => !!x),
  );
  const missingApiKeys = difference(
    expectedApiKeyTitles,
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
