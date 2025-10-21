import type { LocalContext } from '../../../context';
import * as t from 'io-ts';
import colors from 'colors';
import { logger } from '../../../logger';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { existsSync } from 'node:fs';
import cliProgress from 'cli-progress';
import {
  buildTranscendGraphQLClient,
  createPreferenceAccessTokens,
  PreferenceAccessTokenInput,
} from '../../../lib/graphql';
import { readCsv } from '../../../lib/requests';
import { SombraStandardScope } from '@transcend-io/privacy-types';
import { writeCsv } from '../../../lib/helpers';

/**
 * CLI flags accepted by the `generate-access-tokens` command.
 *
 * These are passed down from the CLI parser into the parent process.
 */
export type GenerateAccessTokenCommandFlags = {
  auth: string;
  file: string;
  duration: number;
  transcendUrl: string;
  subjectType: string;
  emailColumnName: string;
  coreIdentifierColumnName?: string;
};

/**
 * Take in a CSV of user identifiers and generate access tokens for each user.
 *
 * Expected CSV columns:
 *   - [emailColumnName] (required)
 *   - [coreIdentifierColumnName] (optional)
 *
 * @param this  - Bound CLI context (provides process exit + logging).
 * @param flags - CLI options for the run.
 */
export async function generateAccessTokens(
  this: LocalContext,
  {
    auth,
    file,
    transcendUrl,
    duration,
    subjectType,
    emailColumnName,
    coreIdentifierColumnName,
  }: GenerateAccessTokenCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);
  if (!existsSync(file)) {
    logger.error(
      colors.red(
        `File does not exist: "${file}". Please provide a valid path to a CSV file.`,
      ),
    );
    this.process.exit(1);
  }

  try {
    // Create a GraphQL client
    const client = buildTranscendGraphQLClient(transcendUrl, auth);

    // Read + parse CSV
    const codec = t.type({
      [emailColumnName]: t.string,
      ...(coreIdentifierColumnName
        ? { [coreIdentifierColumnName]: t.string }
        : {}),
    });
    const rows: Array<Record<string, string>> = readCsv(file, codec);
    if (!rows.length) {
      throw new Error('Input CSV is empty.');
    }

    // Ensure emails and core identifiers exist
    const missingEmail = rows
      .map((r, i) => [r, i] as const)
      .filter(([r]) => !r[emailColumnName]?.trim());
    if (missingEmail.length) {
      const rowNumbers = missingEmail
        .map(([, i]) => i + 2) // +2 to account for header row and 0-indexing
        .join(', ');
      throw new Error(
        `The following rows are missing the required "${emailColumnName}" column: ${rowNumbers}`,
      );
    }
    if (coreIdentifierColumnName) {
      const missingCoreId = rows
        .map((r, i) => [r, i] as const)
        .filter(([r]) => !r[coreIdentifierColumnName]?.trim());
      if (missingCoreId.length) {
        const rowNumbers = missingCoreId
          .map(([, i]) => i + 2) // +2 to account for header row and 0-indexing
          .join(', ');
        throw new Error(
          `The following rows are missing the required "${coreIdentifierColumnName}" column: ${rowNumbers}`,
        );
      }
    }

    // Duration provided by CLI is in ms; GraphQL expects seconds
    const expiresInSeconds = Math.max(1, Math.floor(duration / 1000));

    // Build inputs for GraphQL
    const inputs = rows.map((r): PreferenceAccessTokenInput => {
      const email = r[emailColumnName].trim();
      const coreIdentifier = coreIdentifierColumnName
        ? r[coreIdentifierColumnName]?.trim()
        : undefined;
      const scopes = [SombraStandardScope.PreferenceManagement];
      return {
        subjectType,
        scopes,
        expiresIn: expiresInSeconds,
        email,
        ...(coreIdentifier ? { coreIdentifier } : {}),
      };
    });

    // Progress bar
    const progressBar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic,
    );
    progressBar.start(inputs.length, 0);

    // Kick off token creation (batched internally)
    const t0 = Date.now();
    const results = await createPreferenceAccessTokens(
      client,
      inputs,
      (progress) => {
        progressBar.update(progress);
      },
    );
    progressBar.update(inputs.length);
    progressBar.stop();

    // Prepare output CSV rows
    const outputRows = results.map(({ accessToken }, ind) => ({
      ...rows[ind],
      token: accessToken,
    }));

    logger.info(colors.magenta(`Writing access tokens to file "${file}"...`));
    writeCsv(file, outputRows, true);

    const totalTimeSec = Math.round((Date.now() - t0) / 1000);
    logger.info(
      colors.green(
        `Successfully generated ${results.length} access tokens to "${file}" in ${totalTimeSec}s!`,
      ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error(
      colors.red(
        `An error occurred while generating access tokens: ${
          err?.message || String(err)
        }`,
      ),
    );
    this.process.exit(1);
  }
}
