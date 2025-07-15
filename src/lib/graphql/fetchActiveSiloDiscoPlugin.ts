import { GraphQLClient } from 'graphql-request';
import { logger } from '../../logger';
import { ENABLED_PLUGINS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Plugin {
  /** Associated data silo */
  dataSilo: {
    /** The type of plugin */
    type: string;
  };
  /** The ID of this plugin */
  id: string;
}

export interface PluginResponse {
  /** The key object of the response */
  plugins: {
    /** The total count */
    totalCount: number;
    /** The list of plugins */
    plugins: Plugin[];
  };
}

/**
 * Fetch a data silo discovery plugin
 *
 * @param client - GraphQL client
 * @param dataSiloId - The data silo to look up plugins for
 * @returns An active data silo plugin (if multiple, returns the first)
 */
export async function fetchActiveSiloDiscoPlugin(
  client: GraphQLClient,
  dataSiloId: string,
): Promise<Plugin> {
  const response = await makeGraphQLRequest<PluginResponse>(
    client,
    ENABLED_PLUGINS,
    {
      dataSiloId,
      type: 'DATA_SILO_DISCOVERY',
    },
  );

  const { plugins, totalCount } = response.plugins;
  if (totalCount === 0) {
    logger.error('No active data silo plugins found for this data silo.');
    process.exit(1);
  }

  const plugin = plugins[0];
  return plugin;
}
