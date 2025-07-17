import fs from "node:fs";
import { join } from "node:path";
import { ConsentTrackerStatus } from "@transcend-io/privacy-types";
import colors from "colors";
import { ADMIN_DASH_INTEGRATIONS } from "../../../constants";
import type { LocalContext } from "../../../context";
import { TranscendPullResource } from "../../../enums";
import { validateTranscendAuth } from "../../../lib/api-keys";
import { mapSeries } from "../../../lib/bluebird-replace";
import {
  buildTranscendGraphQLClient,
  pullTranscendConfiguration,
} from "../../../lib/graphql";
import { writeTranscendYaml } from "../../../lib/readTranscendYaml";
import { logger } from "../../../logger";
import {
  DEFAULT_CONSENT_TRACKER_STATUSES,
  DEFAULT_TRANSCEND_PULL_RESOURCES,
} from "./command";

interface PullCommandFlags {
  auth: string;
  resources?: (TranscendPullResource | "all")[];
  file: string;
  transcendUrl: string;
  dataSiloIds?: string[];
  integrationNames?: string[];
  trackerStatuses?: ConsentTrackerStatus[];
  pageSize: number;
  skipDatapoints: boolean;
  skipSubDatapoints: boolean;
  includeGuessedCategories: boolean;
  debug: boolean;
}

export async function pull(
  this: LocalContext,
  {
    auth,
    resources = DEFAULT_TRANSCEND_PULL_RESOURCES,
    file,
    transcendUrl,
    dataSiloIds = [],
    integrationNames = [],
    trackerStatuses = DEFAULT_CONSENT_TRACKER_STATUSES,
    pageSize,
    skipDatapoints,
    skipSubDatapoints,
    includeGuessedCategories,
    debug,
  }: PullCommandFlags
): Promise<void> {
  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  const resourcesToPull: TranscendPullResource[] = resources.includes("all")
    ? Object.values(TranscendPullResource)
    : (resources as TranscendPullResource[]);

  // Sync to Disk
  if (typeof apiKeyOrList === "string") {
    try {
      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKeyOrList);

      const configuration = await pullTranscendConfiguration(client, {
        dataSiloIds,
        integrationNames,
        resources: resourcesToPull,
        pageSize,
        debug,
        skipDatapoints,
        skipSubDatapoints,
        includeGuessedCategories,
        trackerStatuses,
      });

      logger.info(colors.magenta(`Writing configuration to file "${file}"...`));
      writeTranscendYaml(file, configuration);
    } catch (error) {
      logger.error(
        colors.red(
          `An error occurred syncing the schema: ${
            debug ? error.stack : error.message
          }`
        )
      );
      process.exit(1);
    }

    // Indicate success
    logger.info(
      colors.green(
        `Successfully synced yaml file to disk at ${file}! View at ${ADMIN_DASH_INTEGRATIONS}`
      )
    );
  } else {
    if (!fs.lstatSync(file).isDirectory()) {
      throw new Error(
        "File is expected to be a folder when passing in a list of API keys to pull from. e.g. --file=./working/"
      );
    }

    const encounteredErrors: string[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind + 1}/${apiKeyOrList.length}][${
        apiKey.organizationName
      }] `;
      logger.info(
        colors.magenta(
          `~~~\n\n${prefix}Attempting to pull configuration...\n\n~~~`
        )
      );

      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKey.apiKey);

      try {
        const configuration = await pullTranscendConfiguration(client, {
          dataSiloIds,
          integrationNames,
          resources: resourcesToPull,
          pageSize,
          debug,
          skipDatapoints,
          skipSubDatapoints,
          includeGuessedCategories,
          trackerStatuses,
        });

        const filePath = join(file, `${apiKey.organizationName}.yml`);
        logger.info(
          colors.magenta(`Writing configuration to file "${filePath}"...`)
        );
        writeTranscendYaml(filePath, configuration);

        logger.info(
          colors.green(`${prefix}Successfully pulled configuration!`)
        );
      } catch (error) {
        logger.error(
          colors.red(
            `${prefix}Failed to sync configuration. - ${error.message}`
          )
        );
        encounteredErrors.push(apiKey.organizationName);
      }
    });

    if (encounteredErrors.length > 0) {
      logger.info(
        colors.red(
          `Sync encountered errors for "${encounteredErrors.join(
            ","
          )}". View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`
        )
      );

      process.exit(1);
    }
  }
}
