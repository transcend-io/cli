import { existsSync, lstatSync } from 'fs';
import { join } from 'path';
import colors from 'colors';
import { TranscendInput } from '../../../codecs';
import { ADMIN_DASH_INTEGRATIONS } from '../../../constants';
import type { LocalContext } from '../../../context';
import { listFiles, validateTranscendAuth } from '../../../lib/api-keys';
import { mapSeries } from '../../../lib/bluebird-replace';
import {
  buildTranscendGraphQLClient,
  syncConfigurationToTranscend,
} from '../../../lib/graphql';
import { parseVariablesFromString } from '../../../lib/helpers/parseVariablesFromString';
import { mergeTranscendInputs } from '../../../lib/mergeTranscendInputs';
import { readTranscendYaml } from '../../../lib/readTranscendYaml';
import { logger } from '../../../logger';

/**
 * Sync configuration to Transcend
 *
 * @param options - Options
 * @returns True if synced successfully, false if error occurs
 */
async function syncConfiguration({
  transcendUrl,
  auth,
  pageSize,
  publishToPrivacyCenter,
  contents,
  deleteExtraAttributeValues = false,
  classifyService = false,
}: {
  /** Transcend YAML */
  contents: TranscendInput;
  /** Transcend URL */
  transcendUrl: string;
  /** API key */
  auth: string;
  /** Page size */
  pageSize: number;
  /** Skip privacy center publish step */
  publishToPrivacyCenter: boolean;
  /** classify data flow service if missing */
  classifyService?: boolean;
  /** Delete attributes when syncing */
  deleteExtraAttributeValues?: boolean;
}): Promise<boolean> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Sync to Transcend
  try {
    const encounteredError = await syncConfigurationToTranscend(
      contents,
      client,
      {
        pageSize,
        publishToPrivacyCenter,
        classifyService,
        deleteExtraAttributeValues,
      },
    );
    return !encounteredError;
  } catch (err) {
    logger.error(
      colors.red(
        `An unexpected error occurred syncing the schema: ${err.message}`,
      ),
    );
    return false;
  }
}

interface PushCommandFlags {
  auth: string;
  file: string;
  transcendUrl: string;
  pageSize: number;
  variables: string;
  publishToPrivacyCenter: boolean;
  classifyService: boolean;
  deleteExtraAttributeValues: boolean;
}

export async function push(
  this: LocalContext,
  {
    file = './transcend.yml',
    transcendUrl,
    auth,
    variables,
    pageSize,
    publishToPrivacyCenter,
    classifyService,
    deleteExtraAttributeValues,
  }: PushCommandFlags,
): Promise<void> {
  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Parse out the variables
  const vars = parseVariablesFromString(variables);

  // check if we are being passed a list of API keys and a list of files
  let fileList: string[];
  if (Array.isArray(apiKeyOrList) && lstatSync(file).isDirectory()) {
    fileList = listFiles(file).map((filePath) => join(file, filePath));
  } else {
    fileList = file.split(',');
  }

  // Ensure at least one file is parsed
  if (fileList.length < 1) {
    throw new Error('No file specified!');
  }

  // eslint-disable-next-line array-callback-return,consistent-return
  const transcendInputs = fileList.map((filePath) => {
    // Ensure yaml file exists on disk
    if (!existsSync(filePath)) {
      logger.error(
        colors.red(
          `The file path does not exist on disk: ${filePath}. You can specify the filepath using --file=./examples/transcend.yml`,
        ),
      );
      process.exit(1);
    } else {
      logger.info(colors.magenta(`Reading file "${filePath}"...`));
    }

    try {
      // Read in the yaml file and validate it's shape
      const newContents = readTranscendYaml(filePath, vars);
      logger.info(colors.green(`Successfully read in "${filePath}"`));
      return {
        content: newContents,
        name: filePath.split('/').pop()!.replace('.yml', ''),
      };
    } catch (err) {
      logger.error(
        colors.red(
          `The shape of your yaml file is invalid with the following errors: ${err.message}`,
        ),
      );
      process.exit(1);
    }
  });

  // process a single API key
  if (typeof apiKeyOrList === 'string') {
    // if passed multiple inputs, merge them together
    const [base, ...rest] = transcendInputs.map(({ content }) => content);
    const contents = mergeTranscendInputs(base, ...rest);

    // sync the configuration
    const success = await syncConfiguration({
      transcendUrl,
      auth: apiKeyOrList,
      contents,
      publishToPrivacyCenter,
      deleteExtraAttributeValues,
      pageSize,
      classifyService: !!classifyService,
    });

    // exist with error code
    if (!success) {
      logger.info(
        colors.red(
          `Sync encountered errors. View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`,
        ),
      );

      process.exit(1);
    }
  } else {
    // if passed multiple inputs, expect them to be one per instance
    if (
      transcendInputs.length !== 1 &&
      transcendInputs.length !== apiKeyOrList.length
    ) {
      throw new Error(
        'Expected list of yml files to be equal to the list of API keys.' +
          `Got ${transcendInputs.length} YML file${
            transcendInputs.length === 1 ? '' : 's'
          } and ${apiKeyOrList.length} API key${
            apiKeyOrList.length === 1 ? '' : 's'
          }`,
      );
    }

    const encounteredErrors: string[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind + 1}/${apiKeyOrList.length}][${
        apiKey.organizationName
      }] `;
      logger.info(
        colors.magenta(
          `~~~\n\n${prefix}Attempting to push configuration...\n\n~~~`,
        ),
      );

      // use the merged contents if 1 yml passed, else use the contents that map to that organization
      const useContents =
        transcendInputs.length === 1
          ? transcendInputs[0].content
          : transcendInputs.find(
              (input) => input.name === apiKey.organizationName,
            )?.content;

      // Throw error if cannot find a yml file matching that organization name
      if (!useContents) {
        logger.error(
          colors.red(
            `${prefix}Failed to find transcend.yml file for organization: "${apiKey.organizationName}".`,
          ),
        );
        encounteredErrors.push(apiKey.organizationName);
        return;
      }

      const success = await syncConfiguration({
        transcendUrl,
        auth: apiKey.apiKey,
        contents: useContents,
        pageSize,
        publishToPrivacyCenter,
        deleteExtraAttributeValues,
        classifyService,
      });

      if (success) {
        logger.info(
          colors.green(`${prefix}Successfully pushed configuration!`),
        );
      } else {
        logger.error(colors.red(`${prefix}Failed to sync configuration.`));
        encounteredErrors.push(apiKey.organizationName);
      }
    });

    if (encounteredErrors.length > 0) {
      logger.info(
        colors.red(
          `Sync encountered errors for "${encounteredErrors.join(
            ',',
          )}". View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`,
        ),
      );

      process.exit(1);
    }
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced yaml file to Transcend! View at ${ADMIN_DASH_INTEGRATIONS}`,
    ),
  );
}
