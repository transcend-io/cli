import type { UnstructuredSubDataPointRecommendationStatus } from '@transcend-io/privacy-types';
import cliProgress from 'cli-progress';
import colors from 'colors';
import { gql, type GraphQLClient } from 'graphql-request';
import sortBy from 'lodash/sortBy';
import type { DataCategoryInput } from '../codecs';
import { ENTRY_COUNT, makeGraphQLRequest } from '../graphql';
import { logger } from '../logger';

interface UnstructuredSubDataPointRecommendationCsvPreview {
  /** ID of subDatapoint */
  id: string;
  /** Name (or key) of the subdatapoint */
  name: string;
  /** Scanned object ID */
  scannedObjectId: string;
  /** Scanned object path ID */
  scannedObjectPathId: string;
  /** The data silo ID */
  dataSiloId: string;
  /** Personal data category */
  dataSubCategory: DataCategoryInput;
  /** Classification Status */
  status: UnstructuredSubDataPointRecommendationStatus;
  /** Confidence */
  confidence: number;
  /** Classification method */
  classificationMethod: string;
  /** Classifier version */
  classifierVersion: string;
}

interface EntryFilterOptions {
  /** IDs of data silos to filter down */
  dataSiloIds?: string[];
  /** Parent categories to filter down for */
  status?: UnstructuredSubDataPointRecommendationStatus[];
  /** Sub categories to filter down for */
  subCategories?: string[]; // TODO: https://transcend.height.app/T-40482 - do by name not ID
}
/**
 * Pull unstructured subdatapoint information
 *
 * @param client - Client to use for the request
 * @param options - Options
 */
export async function pullUnstructuredSubDataPointRecommendations(
  client: GraphQLClient,
  {
    dataSiloIds = [],
    status,
    subCategories = [],
    pageSize = 100,
  }: EntryFilterOptions & {
    /** Page size to pull in */
    pageSize?: number;
  } = {},
): Promise<UnstructuredSubDataPointRecommendationCsvPreview[]> {
  const unstructuredSubDataPointRecommendations: UnstructuredSubDataPointRecommendationCsvPreview[] =
    [];

  // Time duration
  const t0 = new Date().getTime();

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Filters
  const filterBy = {
    ...(subCategories.length > 0 ? { subCategoryIds: subCategories } : {}),
    ...(status ? { status } : {}),
    ...(dataSiloIds.length > 0 ? { dataSilos: dataSiloIds } : {}),
  };

  // Build a GraphQL client
  const {
    unstructuredSubDataPointRecommendations: { totalCount },
  } = await makeGraphQLRequest<{
    /** Query response */
    unstructuredSubDataPointRecommendations: {
      /** Count */
      totalCount: number;
    };
  }>(client, ENTRY_COUNT, {
    filterBy,
  });

  logger.info(colors.magenta('[Step 1/3] Pulling in all subdatapoints'));

  progressBar.start(totalCount, 0);
  let total = 0;
  let shouldContinue = false;
  let cursor: string | undefined;
  let offset = 0;
  do {
    try {
      const {
        unstructuredSubDataPointRecommendations: { nodes },
        // eslint-disable-next-line no-await-in-loop
      } = await makeGraphQLRequest<{
        /** Query response */
        unstructuredSubDataPointRecommendations: {
          /** List of matches */
          nodes: UnstructuredSubDataPointRecommendationCsvPreview[];
        };
      }>(
        client,
        gql`
          query TranscendCliUnstructuredSubDataPointRecommendationCsvExport(
            $filterBy: UnstructuredSubDataPointRecommendationsFilterInput
            $first: Int!
            $offset: Int!
          ) {
            unstructuredSubDataPointRecommendations(
              filterBy: $filterBy
              first: $first
              offset: $offset
            ) {
              nodes {
                id
                dataSiloId
                scannedObjectPathId
                scannedObjectId
                name
                dataSubCategory {
                  name
                  category
                }
                status
                confidence
                classificationMethod
                classifierVersion
              }
            }
          }
        `,
        {
          first: pageSize,
          offset,
          filterBy: {
            ...filterBy,
          },
        },
      );

      cursor = nodes[nodes.length - 1]?.id as string;
      unstructuredSubDataPointRecommendations.push(...nodes);
      shouldContinue = nodes.length === pageSize;
      total += nodes.length;
      offset += nodes.length;
      progressBar.update(total);
    } catch (err) {
      logger.error(
        colors.red(
          `An error fetching subdatapoints for cursor ${cursor} and offset ${offset}`,
        ),
      );
      throw err;
    }
  } while (shouldContinue);

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  const sorted = sortBy(unstructuredSubDataPointRecommendations, 'name');

  logger.info(
    colors.green(
      `Successfully pulled in ${sorted.length} subdatapoints in ${
        totalTime / 1000
      } seconds!`,
    ),
  );
  return sorted;
}
