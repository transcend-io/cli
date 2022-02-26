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
  DATA_SILO,
} from './gqls';
import {
  convertToDataSubjectBlockList,
  DataSubject,
} from './fetchDataSubjects';
import { ApiKey } from './fetchApiKeys';
import {
  DataCategoryType,
  ProcessingPurpose,
  RequestActionObjectResolver,
} from '@transcend-io/privacy-types';

export interface DataSilo {
  /** ID of dataSilo */
  id: string;
  /** Title of dataSilo */
  title: string;
}

export interface DataSiloEnriched {
  /** ID of dataSilo */
  id: string;
  /** Title of dataSilo */
  title: string;
  /** Description of data silo */
  description: string;
  /** Webhook URL */
  url?: string;
  /** Associated API keys */
  apiKeys: {
    /** Title */
    title: string;
  }[];
  /** Data subject block list */
  subjectBlocklist: {
    /** Type of data subject */
    type: string;
  }[];
  /** Global actions */
  globalActions: {
    /** Whether active */
    active: boolean;
    /** Type of action */
    type: RequestActionObjectResolver;
  }[];
  /** Datapoints */
  dataPoints: {
    /** ID of dataPoint */
    id: string;
    /** Title of dataPoint */
    title: {
      /** Default message */
      defaultMessage: string;
    };
    /** Description */
    description: {
      /** Default message */
      defaultMessage: string;
    };
    /** Name */
    name: string;
    /** Purpose */
    purpose: ProcessingPurpose;
    /** Category */
    category: DataCategoryType;
    /** Global actions */
    actionSettings: {
      /** Action type */
      type: RequestActionObjectResolver;
      /** Is enabled */
      active: boolean;
    }[];
  }[];
  /** Identifiers */
  identifiers: {
    /** Name of identifier */
    name: string;
  }[];
  /** Dependent data silos */
  dependentDataSilos: {
    /** Title of silo */
    title: string;
  }[];
  /** Silo owners */
  owners: {
    /** Email owners */
    email: string;
  }[];
  /** Silo is live */
  isLive: boolean;
}

const PAGE_SIZE = 20;

/**
 * Fetch all dataSilos in the organization
 *
 * @param client - GraphQL client
 * @param title - Filter by title
 * @returns All dataSilos in the organization
 */
export async function fetchAllDataSilos(
  client: GraphQLClient,
  title?: string,
): Promise<DataSilo[]> {
  const dataSilos: DataSilo[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      dataSilos: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await client.request<{
      /** Query response */
      dataSilos: {
        /** List of matches */
        nodes: DataSilo[];
      };
    }>(DATA_SILOS, {
      first: PAGE_SIZE,
      offset,
      title,
    });
    dataSilos.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return dataSilos;
}

/**
 * Fetch all dataSilos with additional metadata
 *
 * @param client - GraphQL client
 * @param title - Filter by title
 * @returns All dataSilos in the organization
 */
export async function fetchEnrichedDataSilos(
  client: GraphQLClient,
  title?: string,
): Promise<DataSiloEnriched[]> {
  const dataSilos: DataSiloEnriched[] = [];

  const silos = await fetchAllDataSilos(client, title);
  await mapSeries(silos, async (silo) => {
    const { dataSilo } = await client.request<{
      /** Query response */
      dataSilo: DataSiloEnriched;
    }>(DATA_SILO, {
      id: silo.id,
    });
    dataSilos.push(dataSilo);
  });

  return dataSilos;
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
  { datapoints, ...dataSilo }: DataSiloInput,
  client: GraphQLClient,
  dataSubjectsByName: { [type in string]: DataSubject },
  apiKeysByTitle: { [title in string]: ApiKey },
): Promise<DataSilo> {
  // Try to fetch an dataSilo with the same title
  const matches = await fetchAllDataSilos(client, dataSilo.title);
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

  // Sync datapoints
  if (datapoints) {
    logger.info(
      colors.magenta(
        `Syncing "${datapoints.length}" datapoints for data silo ${dataSilo.title}...`,
      ),
    );
    await mapSeries(datapoints, async (datapoint) => {
      logger.info(colors.magenta(`Syncing datapoint "${datapoint.key}"...`));
      await client.request(UPDATE_OR_CREATE_DATA_POINT, {
        dataSiloId: existingDataSilo!.id,
        name: datapoint.key,
        title: datapoint.title,
        description: datapoint.description,
        category: datapoint.category,
        purpose: datapoint.purpose,
        enabledActions: datapoint['privacy-actions'] || [], // clear out when not specified
      });

      // TODO:https://transcend.height.app/T-10773 - obj.fields

      logger.info(colors.green(`Synced datapoint "${datapoint.key}"!`));
    });
  }

  return existingDataSilo;
}
