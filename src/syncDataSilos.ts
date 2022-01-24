import { DataSiloInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import {
  DATA_SILOS,
  UPDATE_DATA_SILO,
  CREATE_DATA_SILO,
  UPDATE_OR_CREATE_DATA_POINT,
} from './gqls';
import {
  convertToDataSubjectBlockList,
  DataSubject,
} from './fetchDataSubjects';
import { ApiKey } from './fetchApiKeys';

export interface DataSilo {
  /** ID of dataSilo */
  id: string;
  /** Title of dataSilo */
  title: string;
}

/**
 * Sync a data silo configuration
 *
 * @param input - The transcend input definition
 * @param client - GraphQL client
 * @param dataSubjectsByName - The data subjects in the organization
 * @param apiKeysByTitle - API key title to API key
 * @returns Data silo info
 */
export async function syncDataSilo(
  { objects, ...dataSilo }: DataSiloInput,
  client: GraphQLClient,
  dataSubjectsByName: { [type in string]: DataSubject },
  apiKeysByTitle: { [title in string]: ApiKey },
): Promise<DataSilo> {
  // Try to fetch an dataSilo with the same title
  const {
    dataSilos: { nodes: matches },
  } = await client.request<{
    /** Query response */
    dataSilos: {
      /** List of matches */
      nodes: DataSilo[];
    };
  }>(DATA_SILOS, {
    title: dataSilo.title,
  });
  let existingDataSilo = matches.find(({ title }) => title === dataSilo.title);

  // If data silo exists, update it, else create new
  if (existingDataSilo) {
    await client.request(UPDATE_DATA_SILO, {
      id: existingDataSilo.id,
      title: dataSilo.title,
      url: dataSilo.url,
      description: dataSilo.description,
      identifiers: dataSilo['identity-keys'],
      isLive: !dataSilo.disabled,
      ownerEmails: dataSilo.owners,
      // clear out if not specified, otherwise the update needs to be applied after
      // all data silos are created
      dependedOnDataSiloTitles: dataSilo['deletion-dependencies']
        ? undefined
        : [],
      apiKeyId: dataSilo['api-key-title']
        ? apiKeysByTitle[dataSilo['api-key-title']].id
        : undefined,
      dataSubjectBlockListIds: dataSilo['data-subjects']
        ? convertToDataSubjectBlockList(
            dataSilo['data-subjects'],
            dataSubjectsByName,
          )
        : undefined,
    });
  } else {
    const { connectDataSilo } = await client.request<{
      /** Mutation result */
      connectDataSilo: {
        /** Created data silo */
        dataSilo: DataSilo;
      };
    }>(CREATE_DATA_SILO, {
      title: dataSilo.title,
      url: dataSilo.url,
      description: dataSilo.description || '',
      identifiers: dataSilo['identity-keys'],
      isLive: !dataSilo.disabled,
      ownerEmails: dataSilo.owners,
      // clear out if not specified, otherwise the update needs to be applied after
      // all data silos are created
      dependedOnDataSiloTitles: dataSilo['deletion-dependencies']
        ? undefined
        : [],
      apiKeyId: dataSilo['api-key-title']
        ? apiKeysByTitle[dataSilo['api-key-title']].id
        : undefined,
      dataSubjectBlockListIds: dataSilo['data-subjects']
        ? convertToDataSubjectBlockList(
            dataSilo['data-subjects'],
            dataSubjectsByName,
          )
        : undefined,
    });
    existingDataSilo = connectDataSilo.dataSilo;
  }

  // Update Global Actions
  logger.info(
    colors.magenta(
      `Syncing data silo level privacy actions for "${dataSilo.title}"...`,
    ),
  );
  await client.request(UPDATE_OR_CREATE_DATA_POINT, {
    dataSiloId: existingDataSilo!.id,
    name: '_global',
    enabledActions: dataSilo['privacy-actions'] || [],
  });
  logger.info(colors.green('Synced global actions!'));

  // Sync objects
  if (objects) {
    logger.info(
      colors.magenta(
        `Syncing "${objects.length}" objects for data silo ${dataSilo.title}...`,
      ),
    );
    await mapSeries(objects, async (obj) => {
      logger.info(colors.magenta(`Syncing object "${obj.key}"...`));
      await client.request(UPDATE_OR_CREATE_DATA_POINT, {
        dataSiloId: existingDataSilo!.id,
        name: obj.key,
        title: obj.title,
        description: obj.description,
        category: obj.category,
        purpose: obj.purpose,
        enabledActions: obj['privacy-actions'] || [], // clear out when not specified
      });

      // TODO:https://transcend.height.app/T-10773 - obj.fields

      logger.info(colors.green(`Synced object "${obj.key}"!`));
    });
  }

  return existingDataSilo;
}
