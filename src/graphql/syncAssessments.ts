import { AssessmentInput } from '../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_ASSESSMENT, CREATE_ASSESSMENT } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { map } from 'bluebird';
import { fetchAllAssessments } from './fetchAssessments';
import { keyBy } from 'lodash';
import { fetchAllAssessmentTemplates } from './fetchAssessmentTemplates';
import { logger } from '../logger';

/**
 * Create a new assessment
 *
 * @param client - GraphQL client
 * @param input - Assessment input
 * @returns Assessment ID
 */
export async function createAssessment(
  client: GraphQLClient,
  input: {
    /** Title of assessment */
    title: string;
    /** Template ID */
    assessmentTemplateId: string;
  },
): Promise<string> {
  const {
    createAssessment: { assessment },
  } = await makeGraphQLRequest<{
    /** createAssessment mutation */
    createAssessment: {
      /** Assessment */
      assessment: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_ASSESSMENT, {
    input,
  });
  logger.info(
    colors.green(`Successfully created assessment "${input.title}"!`),
  );
  return assessment.id;
}

/**
 * Update an existing assessment
 *
 * @param client - GraphQL client
 * @param input - Assessment input
 */
export async function updateAssessment(
  client: GraphQLClient,
  input: {
    /** ID of assessment */
    id: string;
    /** Title of assessment */
    title?: string;
    /** Content */
    content?: string;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_ASSESSMENT, {
    input,
  });
  logger.info(
    colors.green(
      `Successfully updated assessment "${input.title || input.id}"!`,
    ),
  );
}

/**
 * Sync the assessments
 *
 * @param client - GraphQL client
 * @param assessments - Assessments
 * @param concurrency - Concurrency
 * @returns True if synced successfully
 */
export async function syncAssessments(
  client: GraphQLClient,
  assessments: AssessmentInput[],
  concurrency = 20,
): Promise<boolean> {
  let successful = true;

  // Index existing templates
  const existing = await fetchAllAssessments(client);
  const assessmentTemplates = await fetchAllAssessmentTemplates(client);
  const assessmentByTitle = keyBy(existing, 'title');
  const assessmentTemplateByTitle = keyBy(assessmentTemplates, 'title');
  await map(
    assessments,
    async (assessment) => {
      try {
        // lookup existing template
        const existingAssessment = assessmentByTitle[assessment.title];

        // Update if exists
        if (existingAssessment) {
          await updateAssessment(client, {
            id: existingAssessment.id,
            title: assessment.title,
            content: assessment.content,
          });
        } else {
          // Create new
          const existingAssessmentTemplate =
            assessmentTemplateByTitle[assessment['assessment-template']];
          if (!existingAssessmentTemplate) {
            throw new Error(
              `Could not find assessment with title: ${assessment['assessment-template']}`,
            );
          }
          const assessmentId = await createAssessment(client, {
            title: assessment.title,
            assessmentTemplateId: existingAssessmentTemplate.id,
          });
          await updateAssessment(client, {
            id: assessmentId,
            content: assessment.content,
          });
        }
      } catch (err) {
        successful = false;
        logger.error(
          `Failed to sync assessment: ${assessment.title} - ${err.message}`,
        );
        logger.info(
          colors.red(
            `Failed to sync assessment "${assessment.title}"! - ${err.message}`,
          ),
        );
      }
    },
    { concurrency },
  );

  return successful;
}
