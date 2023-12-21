import { GraphQLClient } from 'graphql-request';
import { CODE_PACKAGES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { CodePackageType } from '@transcend-io/privacy-types';

export interface CodePackage {
  /** ID of code package */
  id: string;
  /** Name of code package */
  name: string;
  /** Description of code package */
  description: string;
  /** Type of code package */
  type: CodePackageType;
  /** Relative path to code package in repository */
  relativePath: string;
  /** The teams that manage the code package */
  teams: {
    /** ID of team */
    id: string;
    /** Name of team */
    name: string;
  }[];
  /** The users that manage the code package */
  owners: {
    /** ID of user */
    id: string;
    /** Email of user */
    email: string;
  }[];
  /** The repository where the code package belongs */
  repository: {
    /** ID of repository */
    id: string;
    /** Name of repository */
    name: string;
  };
  /** The data silo that the code package relates to */
  dataSilo?: {
    /** ID of repository */
    id: string;
    /** Title of repository */
    title: string;
    /** Type of data silo */
    type: string;
  };
}

const PAGE_SIZE = 20;

/**
 * Fetch all code packages in the organization
 *
 * @param client - GraphQL client
 * @returns All code packages in the organization
 */
export async function fetchAllCodePackages(
  client: GraphQLClient,
): Promise<CodePackage[]> {
  const codePackages: CodePackage[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      codePackages: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Code packages */
      codePackages: {
        /** List */
        nodes: CodePackage[];
      };
    }>(client, CODE_PACKAGES, {
      first: PAGE_SIZE,
      offset,
    });
    codePackages.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return codePackages.sort((a, b) => a.name.localeCompare(b.name));
}
