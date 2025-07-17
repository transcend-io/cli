import { RequestActionObjectResolver } from '@transcend-io/privacy-types';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { difference, flatten, keyBy, uniq } from 'lodash-es';
import { TranscendInput } from '../../codecs';
import { logger } from '../../logger';
import { mapSeries } from '../bluebird-replace';
import { CREATE_DATA_SUBJECT, DATA_SUBJECTS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface DataSubject {
  /** ID of data subject */
  id: string;
  /** Type of data subject */
  type: string;
  /** Whether active */
  active: boolean;
  /** Title of data subject */
  title: {
    /** Default message */
    defaultMessage: string;
  };
  /** Whether silent mode is enabled by default */
  adminDashboardDefaultSilentMode: boolean;
  /** Enabled actions */
  actions: {
    /** Type of action */
    type: RequestActionObjectResolver;
  }[];
}

/**
 * Fetch all data subjects in an organization
 *
 * @param client - GraphQL client
 * @returns List of data subject configurations
 */
export async function fetchAllDataSubjects(
  client: GraphQLClient,
): Promise<DataSubject[]> {
  // Fetch all data subjects in the organization
  const { internalSubjects } = await makeGraphQLRequest<{
    /** Query response */
    internalSubjects: DataSubject[];
  }>(client, DATA_SUBJECTS);
  return internalSubjects;
}

/**
 * Fetch all of the data subjects in the organization
 *
 * @param input - Input to fetch
 * @param client - GraphQL client
 * @param fetchAll - When true, always fetch all subjects
 * @returns The list of data subjects
 */
export async function ensureAllDataSubjectsExist(
  {
    'data-silos': dataSilos = [],
    'data-subjects': dataSubjects = [],
    enrichers = [],
  }: TranscendInput,
  client: GraphQLClient,
  fetchAll = false,
): Promise<{ [type in string]: DataSubject }> {
  // Only need to fetch data subjects if specified in config
  const expectedDataSubjects = uniq([
    ...flatten(dataSilos.map((silo) => silo['data-subjects'] || []) || []),
    ...flatten(
      enrichers.map((enricher) => enricher['data-subjects'] || []) || [],
    ),
    ...dataSubjects.map((subject) => subject.type),
  ]);
  if (expectedDataSubjects.length === 0 && !fetchAll) {
    return {};
  }

  // Fetch all data subjects in the organization
  const internalSubjects = await fetchAllDataSubjects(client);
  const dataSubjectByName = keyBy(internalSubjects, 'type');

  // Determine expected set of data subjects to create
  const missingDataSubjects = difference(
    expectedDataSubjects,
    internalSubjects.map(({ type }) => type),
  );

  // If there are missing data subjects, create new ones
  if (missingDataSubjects.length > 0) {
    logger.info(
      colors.magenta(
        `Creating ${missingDataSubjects.length} new data subjects...`,
      ),
    );
    await mapSeries(missingDataSubjects, async (dataSubject) => {
      logger.info(colors.magenta(`Creating data subject ${dataSubject}...`));
      const { createSubject } = await makeGraphQLRequest<{
        /** Create Subject Response */
        createSubject: {
          /** Created Data Subject */
          subject: DataSubject;
        };
      }>(client, CREATE_DATA_SUBJECT, {
        type: dataSubject,
        skipPublish: true,
      });
      logger.info(colors.green(`Created data subject ${dataSubject}!`));

      dataSubjectByName[dataSubject] = createSubject.subject;
    });
  }

  return dataSubjectByName;
}

/**
 * Convert a list of data subject types into the block list of IDs to assign to the data silo
 *
 * @param dataSubjectTypes - The list of data subject types that the data silo should be for
 * @param allDataSubjects - All data subjects in the organization
 * @returns The block list of data subject ids to not process against this data silo
 */
export function convertToDataSubjectBlockList(
  dataSubjectTypes: string[],
  allDataSubjects: { [type in string]: DataSubject },
): string[] {
  dataSubjectTypes.forEach((type) => {
    if (!allDataSubjects[type]) {
      throw new Error(`Expected to find data subject definition: ${type}`);
    }
  });

  return Object.values(allDataSubjects)
    .filter((silo) => !dataSubjectTypes.includes(silo.type))
    .map(({ id }) => id);
}

/**
 * Convert a list of data subject types into the allow list of types
 *
 * @param dataSubjectTypes - The list of data subject types that the data silo should be for
 * @param allDataSubjects - All data subjects in the organization
 * @returns The allow list of data subjects for that silo
 */
export function convertToDataSubjectAllowlist(
  dataSubjectTypes: string[],
  allDataSubjects: { [type in string]: DataSubject },
): string[] {
  dataSubjectTypes.forEach((type) => {
    if (!allDataSubjects[type]) {
      throw new Error(`Expected to find data subject definition: ${type}`);
    }
  });

  return Object.values(allDataSubjects)
    .filter((silo) => !dataSubjectTypes.includes(silo.type))
    .map(({ type }) => type);
}
