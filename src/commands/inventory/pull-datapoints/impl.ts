import { DataCategoryType } from "@transcend-io/privacy-types";
import colors from "colors";
import { groupBy, uniq } from "lodash-es";
import { ADMIN_DASH_DATAPOINTS } from "../../../constants";
import type { LocalContext } from "../../../context";
import { writeCsv } from "../../../lib/cron";
import { pullAllDatapoints } from "../../../lib/data-inventory";
import { buildTranscendGraphQLClient } from "../../../lib/graphql";
import { logger } from "../../../logger";

interface PullDatapointsCommandFlags {
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
  }: PullDatapointsCommandFlags
): Promise<void> {
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
        "Property ID": point.id,
        "Data Silo": point.dataSilo.title,
        Object: point.dataPoint.name,
        "Object Path": point.dataPoint.path.join("."),
        Property: point.name,
        "Property Description": point.description,
        "Data Categories": point.categories
          .map((category) => `${category.category}:${category.name}`)
          .join(", "),
        "Guessed Category": point.pendingCategoryGuesses?.[0]
          ? `${point.pendingCategoryGuesses[0].category.category}:${point.pendingCategoryGuesses[0].category.name}`
          : "",
        "Processing Purposes": point.purposes
          .map((purpose) => `${purpose.purpose}:${purpose.name}`)
          .join(", "),
        ...Object.entries(
          groupBy(
            point.attributeValues || [],
            ({ attributeKey }) => attributeKey.name
          )
        ).reduce<Record<string, string>>((accumulator, [key, values]) => {
          accumulator[key] = values.map((value) => value.name).join(",");
          return accumulator;
        }, {}),
      };
      headers = uniq([...headers, ...Object.keys(result)]);
      return result;
    });
    writeCsv(file, inputs, headers);
  } catch (error) {
    logger.error(
      colors.red(`An error occurred syncing the datapoints: ${error.message}`)
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced datapoints to disk at ${file}! View at ${ADMIN_DASH_DATAPOINTS}`
    )
  );
}
