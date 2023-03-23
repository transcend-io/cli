import { mapSeries } from 'bluebird';
import {
  buildTranscendGraphQLClientGeneric,
  loginUser,
  createApiKey,
  fetchAllApiKeys,
  deleteApiKey,
  assumeRole,
} from '../graphql';
import { ScopeName } from '@transcend-io/privacy-types';
import colors from 'colors';
import { logger } from '../logger';

export interface ApiKeyAndOrganization {
  /** Name of instance */
  organizationName: string;
  /** API key */
  apiKey: string;
  /** Organization ID API key is for */
  organizationId: string;
}

export interface ApiKeyGenerateError {
  /** Name of instance */
  organizationName: string;
  /** Error */
  error: string;
  /** Organization ID API key is for */
  organizationId: string;
}

/**
 * Generate API keys across multiple transcend accounts
 *
 * @param options - Options
 * @returns Number of API keys created
 */
export async function generateCrossAccountApiKeys({
  email,
  password,
  scopes,
  apiKeyTitle,
  deleteExistingApiKey = true,
  createNewApiKey = true,
  transcendUrl = 'https://api.transcend.io',
}: {
  /** Email address of user generating API keys */
  email: string;
  /** Password of user generating API keys */
  password: string;
  /** Title of the API create to create */
  apiKeyTitle: string;
  /** Title of the API create to create */
  scopes: ScopeName[];
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** When true delete existing API keys with that title, if set to false an API key exists with that title, an error is thrown */
  deleteExistingApiKey?: boolean;
  /** When true, generate new API keys, otherwise only will delete past API keys */
  createNewApiKey?: boolean;
}): Promise<{
  /** Successfully generated */
  apiKeys: ApiKeyAndOrganization[];
  /** Error results */
  errors: ApiKeyGenerateError[];
}> {
  // Create GraphQL client
  const client = await buildTranscendGraphQLClientGeneric(transcendUrl, {});

  // Login the user
  logger.info(colors.magenta('Logging in using email and password.'));
  const { roles, loginCookie } = await loginUser(client, { email, password });
  logger.info(
    colors.green(
      `Successfully logged in and found ${roles.length} role${
        roles.length === 1 ? '' : 's'
      }!`,
    ),
  );

  // Save cookie to call route subsequent times
  client.setHeaders({
    Cookie: loginCookie,
  });

  // Save the resulting API keys
  const results: ApiKeyAndOrganization[] = [];
  const errors: ApiKeyGenerateError[] = [];

  // Generate API keys
  logger.info(
    colors.magenta(
      `Generating API keys with title: ${apiKeyTitle}, scopes: ${scopes.join(
        ',',
      )}.`,
    ),
  );

  // Map over each role
  await mapSeries(roles, async (role) => {
    try {
      // Log into the other instance
      await assumeRole(client, { roleId: role.id, email });

      // Grab API keys with that title
      logger.info(
        colors.magenta(
          `Checking if API key already exists in organization "${role.organization.name}" with title: "${apiKeyTitle}".`,
        ),
      );

      // Delete existing API key
      const [apiKeyWithTitle] = await fetchAllApiKeys(client, [apiKeyTitle]);
      if (apiKeyWithTitle && deleteExistingApiKey) {
        logger.info(
          colors.yellow(
            `Deleting existing API key in "${role.organization.name}" with title: "${apiKeyTitle}".`,
          ),
        );
        await deleteApiKey(client, apiKeyWithTitle.id);
        logger.info(
          colors.green(
            `Successfully deleted API key in "${role.organization.name}" with title: "${apiKeyTitle}".`,
          ),
        );
      } else if (apiKeyWithTitle) {
        // throw error if one exists but not configured to delete
        throw new Error(`API key already exists with title: "${apiKeyTitle}"`);
      }

      // Create the API key
      if (createNewApiKey) {
        logger.info(
          colors.magenta(
            `Creating API key in "${role.organization.name}" with title: "${apiKeyTitle}".`,
          ),
        );
        const { apiKey } = await createApiKey(client, {
          title: apiKeyTitle,
          scopes,
        });
        results.push({
          organizationName: role.organization.name,
          organizationId: role.organization.id,
          apiKey,
        });
        logger.info(
          colors.green(
            `Successfully created API key in "${role.organization.name}" with title: "${apiKeyTitle}".`,
          ),
        );
      } else {
        // Delete only
        results.push({
          organizationName: role.organization.name,
          organizationId: role.organization.id,
          apiKey: '',
        });
      }
    } catch (err) {
      logger.error(
        colors.red(
          `Failed to create API key in organization "${role.organization.name}"! - ${err.message}`,
        ),
      );
      errors.push({
        organizationName: role.organization.name,
        organizationId: role.organization.id,
        error: err.message,
      });
    }
  });
  logger.info(
    colors.green(
      `Successfully created ${results.length} API keys${
        results.length === 1 ? '' : 's'
      }`,
    ),
  );

  if (errors.length > 0) {
    logger.error(
      colors.red(
        `Failed to create ${errors.length} API key${
          errors.length === 1 ? '' : 's'
        }!`,
      ),
    );
  }

  return { errors, apiKeys: results };
}
