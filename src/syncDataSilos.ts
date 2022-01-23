import { DataSiloInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { DATA_SILOS, UPDATE_DATA_SILO, CREATE_DATA_SILO } from './gqls';

/**
 * Sync a data silo configuration
 *
 * @param dataSilo - The data silo input
 * @param client - GraphQL client
 */
export async function syncDataSilo(
  { objects, ...dataSilo }: DataSiloInput,
  client: GraphQLClient,
): Promise<void> {
  // Try to fetch an dataSilo with the same title
  const {
    dataSilos: { nodes: matches },
  } = await client.request<{
    /** Query response */
    dataSilos: {
      /** List of matches */
      nodes: {
        /** ID of dataSilo */
        id: string;
        /** Title of dataSilo */
        title: string;
      }[];
    };
  }>(DATA_SILOS, {
    title: dataSilo.title,
  });
  const existingDataSilo = matches.find(
    ({ title }) => title === dataSilo.title,
  );

  // If data silo exists, update it, else create new
  if (existingDataSilo) {
    // TODO: https://transcend.height.app/T-10530 - convert to block list
    //  'data-subjects': t.array(t.string),

    // TODO: https://transcend.height.app/T-10530 - convert to user ids
    //  owners: t.array(t.string),

    // TODO: https://transcend.height.app/T-10530 - separate route
    //  'deletion-dependencies': t.array(t.string),

    await client.request(UPDATE_DATA_SILO, {
      id: existingDataSilo.id,
      title: dataSilo.title,
      url: dataSilo.url,
      description: dataSilo.description,
      identifiers: dataSilo['identity-keys'],
      isLive: !dataSilo.disabled,
    });
  } else {
    // TODO: https://transcend.height.app/T-10530 - convert to block list
    //  'data-subjects': t.array(t.string),

    // TODO: https://transcend.height.app/T-10530 - convert to user ids
    //  owners: t.array(t.string),

    // TODO: https://transcend.height.app/T-10530 - separate route
    //  'deletion-dependencies': t.array(t.string),

    await client.request(CREATE_DATA_SILO, {
      title: dataSilo.title,
      url: dataSilo.url,
      description: dataSilo.description || '',
      identifiers: dataSilo['identity-keys'],
      isLive: !dataSilo.disabled,
    });
  }

  if (objects) {
    logger.info(
      colors.magenta(
        `Syncing "${objects.length}" objects for data silo ${dataSilo.title}...`,
      ),
    );
    await mapSeries(objects, (obj) => {
      logger.info({ obj });
      // TODO: https://transcend.height.app/T-10530 - check if obj exists already
      // TODO: https://transcend.height.app/T-10530 - If exists then update
      // TODO: https://transcend.height.app/T-10530 - else create

      // TODO: https://transcend.height.app/T-10530 - fields
    });
  }
}
