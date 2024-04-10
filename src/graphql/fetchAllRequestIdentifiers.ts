import { IdentifierType } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Got } from 'got';
import { GraphQLClient } from 'graphql-request';
import * as t from 'io-ts';
import { REQUEST_IDENTIFIERS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

const literalUnion = <T extends t.Mixed>(
  values: T[],
): t.UnionC<[T, T, ...T[]]> => t.union(values as [T, T, ...T[]]);

const IdentifierTypeValues = literalUnion(
  Object.values(IdentifierType).map((v) => t.literal(v)),
);

const RequestIdentifier = t.type({
  /** ID of request */
  id: t.string,
  /** Name of identifier */
  name: t.string,
  /** The underlying identifier value */
  value: t.string,
  /** Type of identifier */
  type: IdentifierTypeValues,
  /** Whether request identifier has been verified at least one */
  isVerifiedAtLeastOnce: t.boolean,
  /** Whether request identifier has been verified */
  isVerified: t.boolean,
});

/** Type override */
export type RequestIdentifier = t.TypeOf<typeof RequestIdentifier>;

const PAGE_SIZE = 50;

export const RequestIdentifiersResponse = t.type({
  identifiers: t.array(RequestIdentifier),
});

/**
 * Fetch all request identifiers for a particular request
 *
 * @param options - Options
 * @returns List of request identifiers
 */
export async function fetchAllRequestIdentifiers({
  client,
  sombra,
  requestId,
  decrypt,
}: {
  /** ID of request to filter on */
  requestId: string;
  /** GraphQL client, used when not decrypting */
  client?: GraphQLClient;
  /** Sombra client, used for decryption */
  sombra?: Got;
  /** Whether or not to decrypt identifier values */
  decrypt: boolean;
}): Promise<RequestIdentifier[]> {
  if (decrypt && !sombra) {
    throw new Error(
      'Sombra client must be provided when decrypting identifiers',
    );
  }

  if (!decrypt && !client) {
    throw new Error('Client must be provided when not decrypting identifiers');
  }

  const requestIdentifiers: RequestIdentifier[] = [];
  let offset = 0;
  let shouldContinue = false;
  do {
    let nodes: RequestIdentifier[] = [];

    if (decrypt) {
      // Get decrypted identifiers via Sombra
      const response = await sombra!
        .post<{
          /** Decrypted identifiers */
          identifiers: RequestIdentifier[];
        }>('v1/request-identifiers', {
          json: {
            first: PAGE_SIZE,
            offset,
            requestId,
          },
        })
        .json();
      ({ identifiers: nodes } = decodeCodec(
        RequestIdentifiersResponse,
        response,
      ));
    } else {
      ({
        requestIdentifiers: { nodes },
        // eslint-disable-next-line no-await-in-loop
      } = await makeGraphQLRequest<{
        /** Request Identifiers */
        requestIdentifiers: {
          /** List */
          nodes: RequestIdentifier[];
        };
      }>(client!, REQUEST_IDENTIFIERS, {
        first: PAGE_SIZE,
        offset,
        requestId,
      }));
    }

    requestIdentifiers.push(...nodes);

    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestIdentifiers;
}
