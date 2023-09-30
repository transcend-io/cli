import { GraphQLClient } from 'graphql-request';
import { ASSESSMENT_TEMPLATES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface AssessmentTemplate {
  /** ID of assessments */
  id: string;
  /** The title of the assessment template. */
  title: string;
  /** The content of the assessment template. */
  content: string;
  /** Attribute attached */
  attributeKeys: {
    /** Name of attribute value */
    name: string;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all AssessmentTemplates in the organization
 *
 * @param client - GraphQL client
 * @returns All AssessmentTemplates in the organization
 */
export async function fetchAllAssessmentTemplates(
  client: GraphQLClient,
): Promise<AssessmentTemplate[]> {
  const assessmentTemplates: AssessmentTemplate[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      assessmentTemplates: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** AssessmentTemplates */
      assessmentTemplates: {
        /** List */
        nodes: AssessmentTemplate[];
      };
    }>(client, ASSESSMENT_TEMPLATES, {
      first: PAGE_SIZE,
      offset,
    });
    assessmentTemplates.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return assessmentTemplates.sort((a, b) => a.title.localeCompare(b.title));
}
