import { GraphQLClient } from 'graphql-request';
import { USERS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface User {
  /** ID of user */
  id: string;
  /** Name of user */
  name: string;
  /** Email of user */
  email: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all users in the organization
 *
 * @param client - GraphQL client
 * @returns All users in the organization
 */
export async function fetchAllUsers(client: GraphQLClient): Promise<User[]> {
  const users: User[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      users: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Users */
      users: {
        /** List */
        nodes: User[];
      };
    }>(client, USERS, {
      first: PAGE_SIZE,
      offset,
    });
    users.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return users.sort((a, b) => a.email.localeCompare(b.email));
}
