import { GraphQLClient, RequestDocument, Variables } from 'graphql-request';
import { logger } from '../logger';
import colors from 'colors';

const MAX_RETRIES = 3;

/**
 * Make a GraphQL request with retries
 *
 * @param client - GraphQL client
 * @param document - document
 * @param variables - Variable
 * @param requestHeaders - Headers
 * @returns Response
 */
export async function makeGraphQLRequest<T, V = Variables>(
  client: GraphQLClient,
  document: RequestDocument,
  variables?: V,
  requestHeaders?: RequestInit['headers'],
): Promise<T> {
  let retryCount = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await client.request(document, variables, requestHeaders);
      return result;
    } catch (err) {
      if (retryCount > MAX_RETRIES) {
        throw err;
      }
      logger.log(
        colors.yellow(
          `REQUEST FAILED: ${err.message}. Retrying ${retryCount}/${MAX_RETRIES}...`,
        ),
      );
      retryCount += 1;
    }
  }
}
