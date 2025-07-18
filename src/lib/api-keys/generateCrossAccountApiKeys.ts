import { ScopeName } from '@transcend-io/privacy-types';
import colors from 'colors';
import { StoredApiKey } from '../../codecs';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { mapSeries } from '../bluebird-replace';
import {
  assumeRole,
  buildTranscendGraphQLClientGeneric,
  createApiKey,
  deleteApiKey,
  fetchAllApiKeys,
  loginUser,
} from '../graphql';

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
  parentOrganizationId,
  deleteExistingApiKey = true,
  createNewApiKey = true,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** Email address of user generating API keys */
  email: string;
  /** Password of user generating API keys */
  password: string;
  /** Filter for organizations that match this parent organization ID */
  parentOrganizationId?: string;
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
  apiKeys: StoredApiKey[];
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

  // Filter down by parentOrganizationId
  const filteredRoles = parentOrganizationId
    ? roles.filter(
        (role) =>
          role.organization.id === parentOrganizationId ||
          role.organization.parentOrganizationId === parentOrganizationId,
      )
    : roles;

  // Save cookie to call route subsequent times
  client.setHeaders({
    Cookie: loginCookie,
  });

  // Save the resulting API keys
  const results: StoredApiKey[] = [];
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
  await mapSeries(filteredRoles, async (role) => {
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
    } catch (error) {
      logger.error(
        colors.red(
          `Failed to create API key in organization "${role.organization.name}"! - ${error.message}`,
        ),
      );
      errors.push({
        organizationName: role.organization.name,
        organizationId: role.organization.id,
        error: error.message,
      });
    }
  });
  logger.info(
    colors.green(
      `Successfully created ${results.length} API key${
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
