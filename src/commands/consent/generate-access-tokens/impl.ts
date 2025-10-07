import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { existsSync } from 'fs';
import { buildTranscendGraphQLClient } from '../../../lib/graphql';
import { writeCsv } from '../../../lib/cron';

/**
 * CLI flags accepted by the `generate-access-tokens` command.
 *
 * These are passed down from the CLI parser into the parent process.
 */
export type GenerateAccessTokenCommandFlags = {
  auth: string;
  file: string;
  transcendUrl: string;
};

/**
 * Take in a CSV of user identifiers and generate access tokens for each user.
 *
 * @param this  - Bound CLI context (provides process exit + logging).
 * @param flags - CLI options for the run.
 */
export async function generateAccessTokens(
  this: LocalContext,
  { auth, file, transcendUrl }: GenerateAccessTokenCommandFlags,
): Promise<void> {
  if (!existsSync(file)) {
    logger.error(
      colors.red(
        `File does not exist: "${file}". Please provide a valid path to a CSV file.`,
      ),
    );
    this.process.exit(1);
  }
  doneInputValidation(this.process.exit);

  try {
    // Create a GraphQL client
    const client = buildTranscendGraphQLClient(transcendUrl, auth);

    // Validate that file is not too big
    // FIXME

    const entries = await pullUnstructuredSubDataPointRecommendations(client, {
      dataSiloIds,
      subCategories, // TODO: https://transcend.height.app/T-40482 - do by name not ID
      status,
      includeEncryptedSnippets,
    });

    logger.info(colors.magenta(`Writing access tokens to file "${file}"...`));
    writeCsv(file, inputs, headers);
  } catch (err) {
    logger.error(
      colors.red(
        `An error occurred while generating access tokens: ${err.message}`,
      ),
    );
    this.process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully generated access tokens and wrote to disk at ${file}!`,
    ),
  );
}
