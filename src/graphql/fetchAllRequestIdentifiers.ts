import { IdentifierType } from '@transcend-io/privacy-types';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import type { Got } from 'got';
import { GraphQLClient } from 'graphql-request';
import * as t from 'io-ts';
import semver from 'semver';

import { REQUEST_IDENTIFIERS, SOMBRA_VERSION } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

const MIN_SOMBRA_VERSION_TO_DECRYPT = '7.180';

const RequestIdentifier = t.type({
  /** ID of request */
  id: t.string,
  /** Name of identifier */
  name: t.string,
  /** The underlying identifier value */
  value: t.string,
  /** Type of identifier */
  type: valuesOf(IdentifierType),
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
  }: {
    /** ID of request to filter on */
    requestId: string;
  },
): Promise<RequestIdentifier[]> {
  const requestIdentifiers: RequestIdentifier[] = [];
  let offset = 0;
  let shouldContinue = false;

  // determine sombra version
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
  }>(client!, SOMBRA_VERSION);

  // Null here represents multi-tenant Sombra
  const decrypt =
    version === null || semver.gte(version, MIN_SOMBRA_VERSION_TO_DECRYPT);

  do {
    let nodes: RequestIdentifier[] = [];

    if (decrypt) {
      let response;

      // Get decrypted identifiers via Sombra
      try {
        // eslint-disable-next-line no-await-in-loop
        response = await sombra!
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
      } catch (error) {
        if (error.response.statusCode === 400) {
          throw new Error(
            "Transcend CLI can't reach the Sombra endpoint to decrypt the identifiers. " +
              'Please ensure Sombra is the correct version to use this feature.',
          );
        }
        throw error;
      }

      // decode response
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
