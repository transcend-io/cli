import got, { Got } from 'got';
import { ORGANIZATION } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { buildTranscendGraphQLClient } from './buildTranscendGraphQLClient';

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
  // Create got instance with default values
  return got.extend({
    prefixUrl: organization.sombra.customerUrl,
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
