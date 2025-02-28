import cliProgress from 'cli-progress';
import { gql } from 'graphql-request';
import colors from 'colors';
import sortBy from 'lodash/sortBy';
import type { GraphQLClient } from 'graphql-request';
import type { DataCategoryInput } from '../codecs';
// import type { UnstructuredSubDataPointRecommendationStatus } from '../enums';
import { ENTRY_COUNT, makeGraphQLRequest } from '../graphql';
import { logger } from '../logger';
import type { DatapointFilterOptions } from './pullAllDatapoints';

interface UnstructuredSubDataPointRecommendationCsvPreview {
  /** ID of subDatapoint */
  id: string;
  /** Name (or key) of the subdatapoint */
  name: string;
  /** Personal data category */
  dataSubCategory: DataCategoryInput;
  /** Scanned object ID */
  scannedObjectId: string;
  /** Scanned object path ID */
  scannedObjectPathId: string;
  /** The data silo ID */
  dataSiloId: string;
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
    // includeGuessedCategories,
    // parentCategories = [],
    subCategories = [],
    pageSize = 100,
  }: DatapointFilterOptions & {
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
    // ...(parentCategories.length > 0 ? { category: parentCategories } : {}),
    ...(subCategories.length > 0 ? { subCategoryIds: subCategories } : {}),
    // if parentCategories or subCategories and not includeGuessedCategories
    // ...(parentCategories.length + subCategories.length > 0 &&
    // !includeGuessedCategories
    //   ? // then only show data points with approved data categories
    //     // FIXME should include validated, corrected, manually added; should exclude classified and rejected
    //     { status: UnstructuredSubDataPointRecommendationStatus.Validated }
    //   : {}),
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
        client, // FIXME below incomplete
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
                name
                dataSiloId
                scannedObjectPathId
                scannedObjectId
                dataSubCategory {
                  name
                  category
                }
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
