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
          await makeGraphQLRequest(client, UPDATE_ASSESSMENT, {
            input: {
              id: existingAssessment.id,
              title: assessment.title,
              content: assessment.content,
            },
          });
          logger.info(
            colors.green(
              `Successfully updated assessment "${assessment.title}"!`,
            ),
          );
        } else {
          // Create new
          const existingAssessmentTemplate =
            assessmentTemplateByTitle[assessment['assessment-template']];
          if (!existingAssessmentTemplate) {
            throw new Error(
              `Could not find assessment with title: ${assessment['assessment-template']}`,
            );
          }
          await makeGraphQLRequest(client, CREATE_ASSESSMENT, {
            input: {
              title: assessment.title,
              content: assessment.content,
              assessmentTemplateId: existingAssessmentTemplate.id,
            },
          });
          logger.info(
            colors.green(
              `Successfully created assessment "${assessment.title}"!`,
            ),
          );
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
