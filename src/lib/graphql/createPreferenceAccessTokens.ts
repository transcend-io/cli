import type { SombraStandardScope } from '@transcend-io/privacy-types';
import { CREATE_PREFERENCE_ACCESS_TOKENS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import type { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';
import Bluebird from 'bluebird';
const { map } = Bluebird;

export interface PreferenceAccessTokenInput {
  /** Slug of data subject to authenticate as */
  subjectType: string;
  /** Scopes to grant */
  scopes: SombraStandardScope[];
  /** Expiration time in seconds */
  expiresIn?: number;
  /** Email address of user */
  email: string;
  /** Core identifier for the user */
  coreIdentifier?: string;
}

const MAX_BATCH_SIZE = 50;

/**
 * Create preference access tokens for the given identifiers.
 *
 * @see https://docs.transcend.io/docs/articles/preference-management/access-links
 * @param client - GraphQL
 * @param records - Inputs to sign
 * @returns list of access tokens
 */
async function createPreferenceAccessTokensPage(
  client: GraphQLClient,
  records: PreferenceAccessTokenInput[],
): Promise<string[]> {
  const {
    createPrivacyCenterAccessTokens: { nodes },
  } = await makeGraphQLRequest<{
    /** createPrivacyCenterAccessTokens mutation */
    createPrivacyCenterAccessTokens: {
      /** Nodes */
      nodes: {
        /** Token */
        token: string;
      }[];
    };
  }>(client, CREATE_PREFERENCE_ACCESS_TOKENS, {
    input: {
      records,
    },
  });
  return nodes.map((node) => node.token);
}

export interface PreferenceAccessTokenInputWithIndex
  extends PreferenceAccessTokenInput {
  /** Index of the input record */
  index?: number;
}

/**
 * Create preference access tokens for the given identifiers.
 *
 * @see https://docs.transcend.io/docs/articles/preference-management/access-links
 * @param client - GraphQL
 * @param records - Inputs to sign
 * @param emitProgress - Optional progress emitter
 * @param concurrency - Number of concurrent requests to make (default: 10)
 * @returns list of access tokens/input identifiers
 */
export async function createPreferenceAccessTokens(
  client: GraphQLClient,
  records: PreferenceAccessTokenInputWithIndex[],
  emitProgress?: (progress: number) => void,
  concurrency = 10,
): Promise<
  {
    /** Identifier for the record */
    input: PreferenceAccessTokenInputWithIndex;
    /** Access token */
    accessToken: string;
  }[]
> {
  let completed = 0;
  if (emitProgress) {
    emitProgress(0);
  }
  const results: {
    /** Identifier for the record */
    input: PreferenceAccessTokenInput;
    /** Access token */
    accessToken: string;
  }[] = [];

  // Then replace the selection with:
  await map(
    chunk(records, MAX_BATCH_SIZE),
    async (chunkedRecords) => {
      const tokens = await createPreferenceAccessTokensPage(
        client,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        chunkedRecords.map(({ index, ...rest }) => rest),
      );
      const mappedResults = tokens.map((token, index) => ({
        input: chunkedRecords[index],
        accessToken: token,
      }));
      results.push(...mappedResults);
      completed += chunkedRecords.length;
      if (emitProgress) {
        emitProgress(completed);
      }
    },
    { concurrency },
  );

  return results;
}
