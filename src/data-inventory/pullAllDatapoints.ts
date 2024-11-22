/* eslint-disable max-lines */
import keyBy from 'lodash/keyBy';
import {
  DataCategoryType,
  SubDataPointDataSubCategoryGuessStatus,
} from '@transcend-io/privacy-types';
import uniq from 'lodash/uniq';
import chunk from 'lodash/chunk';
import cliProgress from 'cli-progress';
import { gql } from 'graphql-request';
import colors from 'colors';
import sortBy from 'lodash/sortBy';
import type { GraphQLClient } from 'graphql-request';
import {
  DATAPOINT_EXPORT,
  DATA_SILO_EXPORT,
  DataSiloAttributeValue,
  SUB_DATA_POINTS_COUNT,
  makeGraphQLRequest,
} from '../graphql';
import { logger } from '../logger';
import { DataCategoryInput, ProcessingPurposeInput } from '../codecs';
import { mapSeries } from 'bluebird';

export interface DataSiloCsvPreview {
  /** ID of dataSilo */
  id: string;
  /** Name of dataSilo */
  title: string;
}

export interface DataPointCsvPreview {
  /** ID of dataPoint */
  id: string;
  /** The path to this data point */
  path: string[];
  /** Description */
  description: {
    /** Default message */
    defaultMessage: string;
  };
  /** Name */
  name: string;
}

export interface SubDataPointCsvPreview {
  /** ID of subDatapoint */
  id: string;
  /** Name (or key) of the subdatapoint */
  name: string;
  /** The description */
  description?: string;
  /** Personal data category */
  categories: DataCategoryInput[];
  /** Data point ID */
  dataPointId: string;
  /** The data silo ID */
  dataSiloId: string;
  /** The processing purpose for this sub datapoint */
  purposes: ProcessingPurposeInput[];
  /** Attribute attached to subdatapoint */
  attributeValues?: DataSiloAttributeValue[];
  /** Data category guesses that are output by the classifier */
  pendingCategoryGuesses?: {
    /** Data category being guessed */
    category: DataCategoryInput;
    /** Status of guess */
    status: SubDataPointDataSubCategoryGuessStatus;
    /** classifier version that produced the guess */
    classifierVersion: number;
  }[];
}

export interface DatapointFilterOptions {
  /** IDs of data silos to filter down */
  dataSiloIds?: string[];
  /** Whether to include guessed categories, defaults to only approved categories */
  includeGuessedCategories?: boolean;
  /** Whether or not to include attributes */
  includeAttributes?: boolean;
  /** Parent categories to filter down for */
  parentCategories?: DataCategoryType[];
  /** Sub categories to filter down for */
  subCategories?: string[]; // TODO: https://transcend.height.app/T-40482 - do by name not ID
}

/**
 * Pull subdatapoint information
 *
 * @param client - Client to use for the request
 * @param options - Options
 */
async function pullSubDatapoints(
  client: GraphQLClient,
  {
    dataSiloIds = [],
    includeGuessedCategories,
    includeAttributes,
    parentCategories = [],
    subCategories = [],
    pageSize = 1000,
  }: DatapointFilterOptions & {
    /** Page size to pull in */
    pageSize?: number;
  } = {},
): Promise<SubDataPointCsvPreview[]> {
  const subDataPoints: SubDataPointCsvPreview[] = [];

  // Time duration
  const t0 = new Date().getTime();

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Filters
  const filterBy = {
    ...(parentCategories.length > 0 ? { category: parentCategories } : {}),
    ...(subCategories.length > 0 ? { subCategoryIds: subCategories } : {}),
    ...(dataSiloIds.length > 0 ? { dataSilos: dataSiloIds } : {}),
  };

  // Build a GraphQL client
  const {
    subDataPoints: { totalCount },
  } = await makeGraphQLRequest<{
    /** Query response */
    subDataPoints: {
      /** Count */
      totalCount: number;
    };
  }>(client, SUB_DATA_POINTS_COUNT, {
    filterBy,
  });

  logger.info(colors.magenta('[Step 1/3] Pulling in all subdatapoints'));

  progressBar.start(totalCount, 0);
  let total = 0;
  let shouldContinue = false;
  let cursor;
  do {
    try {
      const {
        subDataPoints: { nodes },
        // eslint-disable-next-line no-await-in-loop
      } = await makeGraphQLRequest<{
        /** Query response */
        subDataPoints: {
          /** List of matches */
          nodes: SubDataPointCsvPreview[];
        };
      }>(
        client,
        gql`
          query TranscendCliSubDataPointCsvExport(
            $filterBy: SubDataPointFiltersInput
            $first: Int!
          ) {
            subDataPoints(
              filterBy: $filterBy
              first: $first
              useMaster: false
            ) {
              nodes {
                id
                name
                description
                dataPointId
                dataSiloId
                purposes {
                  name
                  purpose
                }
                categories {
                  name
                  category
                }
                ${
                  includeGuessedCategories
                    ? `pendingCategoryGuesses {
                  category {
                    name
                    category
                  }
                  status
                  classifierVersion
                }`
                    : ''
                }
                ${
                  includeAttributes
                    ? `attributeValues {
                  attributeKey {
                    name
                  }
                  name
                }`
                    : ''
                }
              }
            }
          }
        `,
        {
          first: pageSize,
          filterBy: {
            ...filterBy,
            ...(cursor ? { cursor: { id: cursor } } : {}),
          },
        },
      );

      cursor = nodes[nodes.length - 1].id as string;
      subDataPoints.push(...nodes);
      shouldContinue = nodes.length === pageSize;
      total += nodes.length;
      progressBar.update(total);
    } catch (err) {
      logger.error(
        colors.red(`An error fetching subdatapoints for cursor ${cursor}`),
      );
      throw err;
    }
  } while (shouldContinue);

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  const sorted = sortBy(subDataPoints, 'name');

  logger.info(
    colors.green(
      `Successfully pulled in ${sorted.length} subdatapoints in ${
        totalTime / 1000
      } seconds!`,
    ),
  );
  return sorted;
}

/**
 * Pull datapoint information
 *
 * @param client - Client to use for the request
 * @param options - Options
 */
async function pullDatapoints(
  client: GraphQLClient,
  {
    dataPointIds = [],
    pageSize = 100,
  }: {
    /** IDs of data points to filter down */
    dataPointIds: string[];
    /** Page size to pull in */
    pageSize?: number;
  },
): Promise<DataPointCsvPreview[]> {
  const dataPoints: DataPointCsvPreview[] = [];

  // Time duration
  const t0 = new Date().getTime();

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  logger.info(
    colors.magenta(
      `[Step 2/3] Fetching metadata for ${dataPointIds.length} datapoints`,
    ),
  );

  // Group by 100
  const dataPointsGrouped = chunk(dataPointIds, pageSize);

  progressBar.start(dataPointIds.length, 0);
  let total = 0;
  await mapSeries(dataPointsGrouped, async (dataPointIdsGroup) => {
    try {
      const {
        dataPoints: { nodes },
      } = await makeGraphQLRequest<{
        /** Query response */
        dataPoints: {
          /** List of matches */
          nodes: DataPointCsvPreview[];
        };
      }>(client, DATAPOINT_EXPORT, {
        first: pageSize,
        filterBy: {
          ids: dataPointIdsGroup,
        },
      });

      dataPoints.push(...nodes);
      total += dataPointIdsGroup.length;
      progressBar.update(total);
    } catch (err) {
      logger.error(
        colors.red(
          `An error fetching subdatapoints for IDs ${dataPointIdsGroup.join(
            ', ',
          )}`,
        ),
      );
      throw err;
    }
  });

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully pulled in ${dataPoints.length} dataPoints in ${
        totalTime / 1000
      } seconds!`,
    ),
  );
  return dataPoints;
}

/**
 * Pull data silo information
 *
 * @param client - Client to use for the request
 * @param options - Options
 */
async function pullDataSilos(
  client: GraphQLClient,
  {
    dataSiloIds = [],
    pageSize = 100,
  }: {
    /** IDs of data silos to filter down */
    dataSiloIds: string[];
    /** Page size to pull in */
    pageSize?: number;
  },
): Promise<DataSiloCsvPreview[]> {
  const dataSilos: DataSiloCsvPreview[] = [];

  // Time duration
  const t0 = new Date().getTime();

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  logger.info(
    colors.magenta(
      `[Step 3/3] Fetching metadata for ${dataSiloIds.length} data silos`,
    ),
  );

  // Group by 100
  const dataSilosGrouped = chunk(dataSiloIds, pageSize);

  progressBar.start(dataSiloIds.length, 0);
  let total = 0;
  await mapSeries(dataSilosGrouped, async (dataSiloIdsGroup) => {
    try {
      const {
        dataSilos: { nodes },
      } = await makeGraphQLRequest<{
        /** Query response */
        dataSilos: {
          /** List of matches */
          nodes: DataSiloCsvPreview[];
        };
      }>(client, DATA_SILO_EXPORT, {
        first: pageSize,
        filterBy: {
          ids: dataSiloIdsGroup,
        },
      });

      dataSilos.push(...nodes);
      total += dataSiloIdsGroup.length;
      progressBar.update(total);
    } catch (err) {
      logger.error(
        colors.red(
          `An error fetching data silos for IDs ${dataSiloIdsGroup.join(', ')}`,
        ),
      );
      throw err;
    }
  });

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully pulled in ${dataSilos.length} data silos in ${
        totalTime / 1000
      } seconds!`,
    ),
  );
  return dataSilos;
}

/**
 * Pull all datapoints from the data inventory.
 *
 * @param client - Client to use for the request
 * @param options - Options
 */
export async function pullAllDatapoints(
  client: GraphQLClient,
  {
    dataSiloIds = [],
    includeGuessedCategories,
    includeAttributes,
    parentCategories = [],
    subCategories = [],
    pageSize = 1000,
  }: DatapointFilterOptions & {
    /** Page size to pull in */
    pageSize?: number;
  } = {},
): Promise<
  (SubDataPointCsvPreview & {
    /** Data point information */
    dataPoint: DataPointCsvPreview;
    /** Data silo information */
    dataSilo: DataSiloCsvPreview;
  })[]
> {
  // Subdatapoint information
  const subDatapoints = await pullSubDatapoints(client, {
    dataSiloIds,
    includeGuessedCategories,
    includeAttributes,
    parentCategories,
    subCategories,
    pageSize,
  });

  // The datapoint ids to grab
  const dataPointIds = uniq(subDatapoints.map((point) => point.dataPointId));
  const dataPoints = await pullDatapoints(client, {
    dataPointIds,
  });
  const dataPointById = keyBy(dataPoints, 'id');

  // The data silo IDs to grab
  const allDataSiloIds = uniq(subDatapoints.map((point) => point.dataSiloId));
  const dataSilos = await pullDataSilos(client, {
    dataSiloIds: allDataSiloIds,
  });
  const dataSiloById = keyBy(dataSilos, 'id');

  return subDatapoints.map((subDataPoint) => ({
    ...subDataPoint,
    dataPoint: dataPointById[subDataPoint.dataPointId],
    dataSilo: dataSiloById[subDataPoint.dataSiloId],
  }));
}
/* eslint-enable max-lines */
