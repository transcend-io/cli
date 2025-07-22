import { GraphQLClient } from 'graphql-request';
import { REQUEST_FILES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface RequestFileCursor {
  /** The ID of the request file */
  id: string;
  /** The created at timestamp */
  createdAt: string;
}

export interface RequestFile {
  /** The remote ID */
  remoteId: string;
  /** The file name */
  fileName: string;
}

export interface RequestFileResponse {
  /** RequestFiles */
  bulkRequestFiles: {
    /** List */
    nodes: RequestFile[];
    /** The cursor */
    cursor: RequestFileCursor;
  };
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
    /** Filter by data silo ID */
    dataSiloId?: string;
  },
): Promise<RequestFile[]> {
  const requestFiles: RequestFile[] = [];
  let cursor: RequestFileCursor | null = null;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const response: RequestFileResponse = await makeGraphQLRequest<RequestFileResponse>(
      client,
      REQUEST_FILES,
      {
        first: PAGE_SIZE,
        filterBy: {
          ...filterBy,
          cursor: cursor ?? undefined,
        },
      });
    const {
      bulkRequestFiles: { nodes, cursor: cursorFromResponse },
    } = response;
    requestFiles.push(...nodes);
    shouldContinue = nodes.length === PAGE_SIZE;
    cursor = cursorFromResponse;
  } while (shouldContinue);

  return requestFiles.sort((a, b) => a.remoteId.localeCompare(b.remoteId));
}
