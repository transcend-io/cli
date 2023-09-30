import { AssessmentTemplateInput } from '../codecs';
import colors from 'colors';

import { GraphQLClient } from 'graphql-request';
import { UPDATE_ASSESSMENT_TEMPLATE, CREATE_ASSESSMENT_TEMPLATE } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { map } from 'bluebird';
import { keyBy } from 'lodash';
import { fetchAllAssessmentTemplates } from './fetchAssessmentTemplates';
import { logger } from '../logger';

/**
 * Sync the assessments
 *
 * @param client - GraphQL client
 * @param assessmentTemplates - Assessment templates
 * @param concurrency - Concurrency
 */
export async function syncAssessmentTemplates(
  client: GraphQLClient,
  assessmentTemplates: AssessmentTemplateInput[],
  concurrency = 20,
): Promise<boolean> {
  let successful = true;
  // Index existing templates
  const existingAssessmentTemplates = await fetchAllAssessmentTemplates(client);
  const assessmentTemplateByTitle = keyBy(existingAssessmentTemplates, 'title');
  await map(
    assessmentTemplates,
    async (assessmentTemplate) => {
      try {
        // lookup existing template
        const existingAssessmentTemplate =
          assessmentTemplateByTitle[assessmentTemplate.title];

        // Update if exists
        if (existingAssessmentTemplate) {
          await makeGraphQLRequest(client, UPDATE_ASSESSMENT_TEMPLATE, {
            input: {
              id: existingAssessmentTemplate.id,
              title: assessmentTemplate.title,
              content: assessmentTemplate.content,
            },
          });
          logger.info(
            colors.green(
              `Successfully updated assessment template "${assessmentTemplate.title}"!`,
            ),
          );
        } else {
          await makeGraphQLRequest(client, CREATE_ASSESSMENT_TEMPLATE, {
            input: {
              title: assessmentTemplate.title,
              content: assessmentTemplate.content,
            },
          });
          logger.info(
            colors.green(
              `Successfully created assessment template "${assessmentTemplate.title}"!`,
            ),
          );
        }
      } catch (err) {
        successful = false;
        logger.error(
          `Failed to sync assessment: ${assessmentTemplate.title} - ${err.message}`,
        );
        logger.info(
          colors.red(
            `Failed to sync assessment "${assessmentTemplate.title}"! - ${err.message}`,
          ),
        );
      }
    },
    { concurrency },
  );

  return successful;
}
