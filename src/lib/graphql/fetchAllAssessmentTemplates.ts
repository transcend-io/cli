import {
  AssessmentFormTemplateSource,
  AssessmentFormTemplateStatus,
} from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import type {
  AssessmentSection,
  RetentionSchedule,
  UserPreview,
} from './fetchAllAssessments';
import { ASSESSMENT_TEMPLATES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Represents an assessment template with various properties and metadata.
 */
export interface AssessmentTemplate {
  /** The ID of the assessment template */
  id: string;
  /** The user who created the assessment template */
  creator: UserPreview;
  /** The user who last edited the assessment template */
  lastEditor: UserPreview;
  /** The title of the assessment template */
  title: string;
  /** The description of the assessment template */
  description: string;
  /** The current status of the assessment template */
  status: AssessmentFormTemplateStatus;
  /** The source fo the form template */
  source: AssessmentFormTemplateSource;
  /** ID of parent template */
  parentId: string;
  /** Indicates if the assessment template is locked */
  isLocked: boolean;
  /** Indicates if the assessment template is archived */
  isArchived: boolean;
  /** The date when the assessment template was created */
  createdAt: string;
  /** The date when the assessment template was last updated */
  updatedAt: string;
  /** The retention schedule of the assessment template */
  retentionSchedule?: RetentionSchedule;
  /** The sections of the assessment template */
  sections: AssessmentSection[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all assessment templates in the organization
 *
 * @param client - GraphQL client
 * @returns All assessment templates in the organization
 */
export async function fetchAllAssessmentTemplates(
  client: GraphQLClient,
): Promise<AssessmentTemplate[]> {
  const assessmentTemplates: AssessmentTemplate[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      assessmentFormTemplates: { nodes },
    } = await makeGraphQLRequest<{
      /** Templates */
      assessmentFormTemplates: {
        /** Nodes */
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
