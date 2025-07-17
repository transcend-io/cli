/* eslint-disable unicorn/filename-case */
import colors from 'colors';
import {
  ClientError,
  type GraphQLClient,
  type RequestDocument,
  type Variables,
} from 'graphql-request';
import { logger } from '../../logger';

const MAX_RETRIES = 4;

/**
 * Sleep in a promise
 *
 * @param sleepTime - The time to sleep in milliseconds.
 * @returns Resolves promise
 */
function sleepPromise(sleepTime: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(sleepTime);
    }, sleepTime);
  });
}

const KNOWN_ERRORS = [
  'syntax error',
  'got invalid value',
  'Client error',
  'cannot affect row a second time',
  'GRAPHQL_VALIDATION_FAILED',
];

/**
 * Make a GraphQL request with retries
 *
 * @param client - GraphQL client
 * @param document - document
 * @param variables - Variable
 * @param requestHeaders - Headers
 * @param maxRequests - Max number of requests
 * @returns Response
 */
export async function makeGraphQLRequest<T>(
  client: GraphQLClient,
  document: RequestDocument,
  variables?: Variables,
  requestHeaders?: Record<string, string> | string[][] | Headers,
  maxRequests = MAX_RETRIES,
): Promise<T> {
  let retryCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    try {
      const result = await client.request(document, variables, requestHeaders);
      return result as T;
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new TypeError('Unknown CLI Error', { cause: error });
      }

      if (error.message.includes('API key is invalid')) {
        throw new Error(
          'API key is invalid. ' +
            'Please ensure that the key provided to `transcendAuth` has the proper scope and is not expired, ' +
            'and that `transcendUrl` corresponds to the correct backend for your organization.',
        );
      }

      if (KNOWN_ERRORS.some((message) => error.message.includes(message))) {
        throw error;
      }

      // wait for rate limit to resolve
      if (
        error instanceof ClientError &&
        error.message.startsWith('Client error: Too many requests')
      ) {
        const headers = error.response.headers as Headers | undefined;
        const rateLimitResetAt = headers?.get('x-ratelimit-reset');
        const sleepTime = rateLimitResetAt
          ? new Date(rateLimitResetAt).getTime() - Date.now() + 100
          : 1000 * 10;
        logger.log(
          colors.yellow(
            `DETECTED RATE LIMIT: ${error.message}. Sleeping for ${sleepTime.toLocaleString()}ms`,
          ),
        );

        await sleepPromise(sleepTime);
      }

      if (retryCount >= maxRequests) {
        throw error;
      }
      retryCount += 1;
      logger.log(
        colors.yellow(
          `REQUEST FAILED: ${error.message}. Retrying ${retryCount.toLocaleString()}/${maxRequests.toLocaleString()}...`,
        ),
      );
    }
  }
}
