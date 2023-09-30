import { GraphQLClient } from 'graphql-request';
import { ASSESSMENTS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { AttributeSupportedResourceType } from '@transcend-io/privacy-types';

export interface Assessment {
  /** ID of assessment */
  id: string;
  /** The title of the assessment template. */
  title: string;
  /** The content of the assessment template. */
  content: string;
  /** Title of the assessment template */
  assessmentTemplate: {
    /** ID of template */
    id: string;
    /** Title of template */
    title: string;
  };
  /** Resources */
  resources: {
    /** Resource type */
    resourceType: AttributeSupportedResourceType;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all Assessments in the organization
 *
 * @param client - GraphQL client
 * @returns All Assessments in the organization
 */
export async function fetchAllAssessments(
  client: GraphQLClient,
): Promise<Assessment[]> {
  const assessments: Assessment[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      assessments: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Assessments */
      assessments: {
        /** List */
        nodes: Assessment[];
      };
    }>(client, ASSESSMENTS, {
      first: PAGE_SIZE,
      offset,
    });
    assessments.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return assessments.sort((a, b) => a.title.localeCompare(b.title));
}
