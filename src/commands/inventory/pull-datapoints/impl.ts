import type { LocalContext } from '../../../context';
import { uniq, groupBy } from 'lodash-es';

import { logger } from '../../../logger';
import colors from 'colors';
import { buildTranscendGraphQLClient } from '../../../lib/graphql';
import { ADMIN_DASH_DATAPOINTS } from '../../../constants';
import { pullAllDatapoints } from '../../../lib/data-inventory';
import { writeCsv } from '../../../lib/cron';
import { DataCategoryType } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface PullDatapointsCommandFlags {
  auth: string;
  file: string;
  transcendUrl: string;
  dataSiloIds?: string[];
  includeAttributes: boolean;
  includeGuessedCategories: boolean;
  parentCategories?: DataCategoryType[];
  subCategories?: string[];
}

export async function pullDatapoints(
  this: LocalContext,
  {
    auth,
    file,
    transcendUrl,
    dataSiloIds,
    includeAttributes,
    includeGuessedCategories,
    parentCategories,
    subCategories = [],
  }: PullDatapointsCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  try {
    // Create a GraphQL client
    const client = buildTranscendGraphQLClient(transcendUrl, auth);

    const dataPoints = await pullAllDatapoints(client, {
      dataSiloIds,
      includeGuessedCategories,
      parentCategories,
      includeAttributes,
      subCategories, // TODO: https://transcend.height.app/T-40482 - do by name not ID
    });

    logger.info(colors.magenta(`Writing datapoints to file "${file}"...`));
    let headers: string[] = [];
    const inputs = dataPoints.map((point) => {
      const result = {
        'Property ID': point.id,
        'Data Silo': point.dataSilo.title,
        Object: point.dataPoint.name,
        'Object Path': point.dataPoint.path.join('.'),
        Property: point.name,
        'Property Description': point.description,
        'Data Categories': point.categories
          .map((category) => `${category.category}:${category.name}`)
          .join(', '),
        'Guessed Category': point.pendingCategoryGuesses?.[0]
          ? `${point.pendingCategoryGuesses![0]!.category.category}:${
              point.pendingCategoryGuesses![0]!.category.name
            }`
          : '',
        'Processing Purposes': point.purposes
          .map((purpose) => `${purpose.purpose}:${purpose.name}`)
          .join(', '),
        ...Object.entries(
          groupBy(
            point.attributeValues || [],
            ({ attributeKey }) => attributeKey.name,
          ),
        ).reduce((acc, [key, values]) => {
          acc[key] = values.map((value) => value.name).join(',');
          return acc;
        }, {} as Record<string, string>),
      };
      headers = uniq([...headers, ...Object.keys(result)]);
      return result;
    });
    writeCsv(file, inputs, headers);
  } catch (err) {
    logger.error(
      colors.red(`An error occurred syncing the datapoints: ${err.message}`),
    );
    this.process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced datapoints to disk at ${file}! View at ${ADMIN_DASH_DATAPOINTS}`,
    ),
  );
}
