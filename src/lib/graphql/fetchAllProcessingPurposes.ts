import { ProcessingPurpose } from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import { PROCESSING_PURPOSE_SUB_CATEGORIES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface ProcessingPurposeSubCategory {
  /** ID of processing purpose */
  id: string;
  /** Name of processing purpose */
  name: string;
  /** Type of processing purpose */
  purpose: ProcessingPurpose;
  /** Description of processing purpose */
  description?: string;
  /** Assigned teams */
  teams: {
    /** Team name */
    name: string;
  }[];
  /** Assigned owners */
  owners: {
    /** Email */
    email: string;
  }[];
  /** Custom fields */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key that the value represents */
    attributeKey: {
      /** Name of attribute team */
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all processingPurposeSubCategories in the organization
 *
 * @param client - GraphQL client
 * @returns All processingPurposeSubCategories in the organization
 */
export async function fetchAllProcessingPurposes(
  client: GraphQLClient,
): Promise<ProcessingPurposeSubCategory[]> {
  const processingPurposeSubCategories: ProcessingPurposeSubCategory[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      processingPurposeSubCategories: { nodes },
    } = await makeGraphQLRequest<{
      /** DataCategories */
      processingPurposeSubCategories: {
        /** List */
        nodes: ProcessingPurposeSubCategory[];
      };
    }>(client, PROCESSING_PURPOSE_SUB_CATEGORIES, {
      first: PAGE_SIZE,
      offset,
    });
    processingPurposeSubCategories.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return processingPurposeSubCategories.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
