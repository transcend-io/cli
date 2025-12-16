import got, { Got } from 'got';
import colors from 'colors';
import { ORGANIZATION } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { buildTranscendGraphQLClient } from './buildTranscendGraphQLClient';
import { logger } from '../../logger';

/**
 * Instantiate an instance of got that is capable of making requests
 * to a sombra gateway.
 *
 * @param transcendUrl - URL of Transcend API
 * @param transcendApiKey - Transcend API key
 * @param sombraApiKey - Sombra API key
 * @returns The instance of got that is capable of making requests to the customer ingress
 */
export async function createSombraGotInstance(
  transcendUrl: string,
  transcendApiKey: string,
  sombraApiKey?: string,
): Promise<Got> {
  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, transcendApiKey);
  // Grab metadata about organization's sombra from GraphQL endpoint
  const { organization } = await makeGraphQLRequest<{
    /** Requests */
    organization: {
      /** PrimarySombra related to organization */
      sombra: {
        /** URL of sombra */
        customerUrl: string;
      };
    };
  }>(client, ORGANIZATION);
  // Check if the sombra customerUrl is the default reverse tunnel URL
  const { customerUrl } = organization.sombra;
  if (
    [
      'https://sombra-reverse-tunnel.transcend.io',
      'https://sombra-reverse-tunnel.us.transcend.io',
    ].includes(customerUrl)
  ) {
    throw new Error(
      'It looks like your Sombra customer ingress URL has not been set up. ' +
        'Please follow the instructions here to configure networking for Sombra: ' +
        'https://docs.transcend.io/docs/articles/sombra/deploying/customizing-sombra/networking',
    );
  }
  logger.info(colors.green(`Using sombra: ${customerUrl}`));
  // Create got instance with default values
  return got.extend({
    prefixUrl: process.env.SOMBRA_URL || customerUrl,
    headers: {
      Authorization: `Bearer ${transcendApiKey}`,
      ...(sombraApiKey
        ? {
            'X-Sombra-Authorization': `Bearer ${sombraApiKey}`,
          }
        : {}),
    },
  });
}
