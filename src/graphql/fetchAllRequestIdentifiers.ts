import * as t from 'io-ts';
import { GraphQLClient } from 'graphql-request';
import { REQUEST_IDENTIFIERS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { IdentifierType } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import { decodeCodec } from '@transcend-io/type-utils';

const RequestIdentifier = t.type({
  /** ID of request */
  id: t.string,
  /** Name of identifier */
  name: t.string,
  /** The underlying identifier value */
  value: t.string,
  /** Identifier metadata */
  identifier: t.type({
    /** Type of identifier */
    type: t.keyof(IdentifierType),
  }),
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
 * @param client - GraphQL client, used if options.decrypt is false
 * @param sombra - Sombra client, used if options.decrypt is true
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchAllRequestIdentifiers(
  client: GraphQLClient,
  sombra: Got,
  {
    requestId,
    decrypt = false,
  }: {
    /** ID of request to filter on */
    requestId: string;
    /** Whether or not to decrypt identifier values */
    decrypt?: boolean;
  },
): Promise<RequestIdentifier[]> {
  const requestIdentifiers: RequestIdentifier[] = [];
  let offset = 0;

  if (decrypt) {
    // Decrypt
    const response = await sombra
      .post<{
        /** Decrypted identifiers */
        identifiers: RequestIdentifier[];
      }>('v1/request-identifiers', {
        json: {
          requestId,
        },
      })
      .json();
    const { identifiers } = decodeCodec(RequestIdentifiersResponse, response);

    requestIdentifiers.push(...identifiers);
  } else {
    // Paginate
    let shouldContinue = false;
    do {
      const {
        requestIdentifiers: { nodes },
        // eslint-disable-next-line no-await-in-loop
      } = await makeGraphQLRequest<{
        /** Request Identifiers */
        requestIdentifiers: {
          /** List */
          nodes: RequestIdentifier[];
        };
      }>(client, REQUEST_IDENTIFIERS, {
        first: PAGE_SIZE,
        offset,
        requestId,
      });

      requestIdentifiers.push(...nodes);

      offset += PAGE_SIZE;
      shouldContinue = nodes.length === PAGE_SIZE;
    } while (shouldContinue);
  }

  return requestIdentifiers;
}
