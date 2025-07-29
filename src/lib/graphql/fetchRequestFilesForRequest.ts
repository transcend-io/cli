import { GraphQLClient } from 'graphql-request';
import { BULK_REQUEST_FILES } from './gqls';
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
    /** The page info */
    pageInfo: {
      /** Whether there is a next page */
      hasNextPage: boolean;
      /** The end cursor */
      endCursor: string;
    };
  };
}

/**
 * Fetch all RequestFiles for a single request
 *
 * @param client - GraphQL client
 * @param pageSize - How many request files to fetch per API call
 * @param filterBy - Filter by
 * @returns All RequestFiles in the organization
 */
export async function fetchRequestFilesForRequest(
  client: GraphQLClient,
  /** How many request files to fetch per API call */
  pageSize: number,
  filterBy: {
    /** Filter by request IDs */
    requestIds: string[];
    /** Filter by data silo ID */
    dataSiloId?: string;
  },
): Promise<RequestFile[]> {
  const requestFiles: RequestFile[] = [];
  let cursor: string | null = null;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const response: RequestFileResponse = await makeGraphQLRequest<RequestFileResponse>(
      client,
      BULK_REQUEST_FILES,
      {
        filterBy: {
          ...filterBy,
        },
        first: pageSize,
        after: cursor ?? undefined,
      });
    const {
      bulkRequestFiles: { nodes, pageInfo },
    } = response;
    requestFiles.push(...nodes);
    shouldContinue = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  } while (shouldContinue);

  return requestFiles.sort((a, b) => a.remoteId.localeCompare(b.remoteId));
}
