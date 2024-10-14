import { GraphQLClient } from 'graphql-request';
import { REQUEST_FILES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface RequestFile {
  /** The remote ID */
  remoteId: string;
  /** The file name */
  fileName: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all RequestFiles for a single request
 *
 * @param client - GraphQL client
 * @param filterBy - Filter by
 * @returns All RequestFiles in the organization
 */
export async function fetchRequestFilesForRequest(
  client: GraphQLClient,
  filterBy: {
    /** Filter by request ID */
    requestId: string;
  },
): Promise<RequestFile[]> {
  const requestFiles: RequestFile[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      requestFiles: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** RequestFiles */
      requestFiles: {
        /** List */
        nodes: RequestFile[];
      };
    }>(client, REQUEST_FILES, {
      first: PAGE_SIZE,
      offset,
      filterBy,
    });
    requestFiles.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestFiles.sort((a, b) => a.remoteId.localeCompare(b.remoteId));
}