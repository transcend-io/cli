import { IdentifierType } from '@transcend-io/privacy-types';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import type { Got } from 'got';
import { GraphQLClient } from 'graphql-request';
import * as t from 'io-ts';
import semver from 'semver';

import { SOMBRA_VERSION } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

const MIN_SOMBRA_VERSION_TO_DECRYPT = '7.180.0';

const RequestIdentifier = t.type({
  /** ID of request */
  id: t.string,
  /** Name of identifier */
  name: t.string,
  /** The underlying identifier value */
  value: t.string,
  /** Type of identifier */
  type: valuesOf(IdentifierType),
});

/** Type override */
export type RequestIdentifier = t.TypeOf<typeof RequestIdentifier>;

const PAGE_SIZE = 100;

const PageInfo = t.type({
  endCursor: t.union([t.string, t.null]),
  hasNextPage: t.boolean,
});

export const RequestIdentifiersResponse = t.type({
  identifiers: t.array(RequestIdentifier),
  pageInfo: PageInfo,
});

const BatchRequestIdentifier = t.type({
  id: t.string,
  name: t.string,
  value: t.string,
  type: valuesOf(IdentifierType),
  requestId: t.string,
});

const BatchRequestIdentifiersResponse = t.type({
  identifiers: t.array(BatchRequestIdentifier),
  pageInfo: PageInfo,
});

/**
 * Validate that the Sombra version meets the minimum requirement for
 * decrypting request identifiers. Call once before bulk-fetching identifiers
 * to avoid repeating this check on every request.
 *
 * @param client - GraphQL client
 */
export async function validateSombraVersion(
  client: GraphQLClient,
): Promise<void> {
  const {
    organization: {
      sombra: { version },
    },
  } = await makeGraphQLRequest<{
    /** The organization */
    organization: {
      /** Sombra */
      sombra: {
        /** Version string */
        version: string;
      };
    };
  }>(client, SOMBRA_VERSION);

  if (version && semver.lt(version, MIN_SOMBRA_VERSION_TO_DECRYPT)) {
    throw new Error(
      `Please upgrade Sombra to ${MIN_SOMBRA_VERSION_TO_DECRYPT} or greater to use this command.`,
    );
  }
}

/**
 * Fetch all request identifiers for a particular request
 *
 * @param client - GraphQL client
 * @param sombra - Sombra client
 * @param options - Options
 * @returns List of request identifiers
 */
export async function fetchAllRequestIdentifiers(
  client: GraphQLClient,
  sombra: Got,
  {
    requestId,
    skipSombraCheck = false,
  }: {
    /** ID of request to filter on */
    requestId: string;
    /** Skip the Sombra version check (caller already validated) */
    skipSombraCheck?: boolean;
  },
): Promise<RequestIdentifier[]> {
  const requestIdentifiers: RequestIdentifier[] = [];
  let endCursor: string | undefined;
  let shouldContinue = true;

  if (!skipSombraCheck) {
    await validateSombraVersion(client);
  }

  while (shouldContinue) {
    let response: unknown;
    try {
      response = await sombra!
        .post<{
          /** Decrypted identifiers */
          identifiers: RequestIdentifier[];
          /** Pagination info */
          pageInfo: {
            /** Cursor for the last item */
            endCursor: string | null;
            /** Whether more pages exist */
            hasNextPage: boolean;
          };
        }>('v1/request-identifiers', {
          json: {
            first: PAGE_SIZE,
            after: endCursor ?? undefined,
            requestId,
          },
        })
        .json();
    } catch (err) {
      throw new Error(
        `Failed to fetch request identifiers: ${
          err?.response?.body || err?.message
        }`,
      );
    }

    const { identifiers: nodes, pageInfo } = decodeCodec(
      RequestIdentifiersResponse,
      response,
    );

    requestIdentifiers.push(...nodes);

    endCursor = pageInfo.endCursor ?? undefined;
    shouldContinue = pageInfo.hasNextPage;
  }

  return requestIdentifiers;
}

/**
 * Fetch request identifiers for multiple requests in a single paginated call.
 * Returns a Map keyed by requestId so callers can look up identifiers per request.
 *
 * @param sombra - Sombra client
 * @param options - Options
 * @returns Map of requestId to its identifiers
 */
export async function fetchRequestIdentifiersBatch(
  sombra: Got,
  {
    requestIds,
  }: {
    /** IDs of requests to fetch identifiers for */
    requestIds: string[];
  },
): Promise<Map<string, RequestIdentifier[]>> {
  const result = new Map<string, RequestIdentifier[]>();

  if (requestIds.length === 0) {
    return result;
  }

  // Ensure every requested ID has an entry even if Sombra returns nothing for it
  for (const id of requestIds) {
    result.set(id, []);
  }

  let cursor: string | undefined;
  let shouldContinue = true;

  while (shouldContinue) {
    let response: unknown;
    try {
      response = await sombra
        .post('v1/request-identifiers', {
          json: {
            first: PAGE_SIZE,
            after: cursor ?? undefined,
            requestIds,
          },
        })
        .json();
    } catch (err) {
      throw new Error(
        `Failed to fetch request identifiers: ${
          err?.response?.body || err?.message
        }`,
      );
    }

    const { identifiers: nodes, pageInfo } = decodeCodec(
      BatchRequestIdentifiersResponse,
      response,
    );

    for (const { requestId, ...identifier } of nodes) {
      const list = result.get(requestId);
      if (list) {
        list.push(identifier);
      } else {
        result.set(requestId, [identifier]);
      }
    }

    cursor = pageInfo.endCursor ?? undefined;
    shouldContinue = pageInfo.hasNextPage;
  }

  return result;
}
