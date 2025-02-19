import { logger } from '../../logger';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import {
  IMPORT_ONE_TRUST_ASSESSMENT_FORMS,
  makeGraphQLRequest,
} from '../../graphql';
import { ImportOnetrustAssessmentsInput } from '../../codecs';
import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import { oneTrustAssessmentToJson } from './oneTrustAssessmentToJson';

export interface AssessmentForm {
  /** ID of Assessment Form */
  id: string;
  /** Title of Assessment Form */
  name: string;
}

/**
 * Write the assessment to a Transcend instance.
 *
 *
 * @param param - information about the assessment and Transcend instance to write to
 */
export const syncOneTrustAssessmentToTranscend = async ({
  transcend,
  assessment,
  total,
  index,
}: {
  /** the Transcend client instance */
  transcend: GraphQLClient;
  /** the assessment to sync to Transcend */
  assessment: OneTrustEnrichedAssessment;
  /** The index of the assessment being written to the file */
  index: number;
  /** The total amount of assessments that we will write */
  total: number;
}): Promise<void> => {
  logger.info(
    colors.magenta(
      `Writing enriched assessment ${index + 1} of ${total} to Transcend...`,
    ),
  );

  // convert the OneTrust assessment object into a json record
  const json = oneTrustAssessmentToJson({
    assessment,
    index,
    total,
  });

  // transform the json record into a valid input to the mutation
  const input: ImportOnetrustAssessmentsInput = {
    json,
  };

  try {
    await makeGraphQLRequest<{
      /** the importOneTrustAssessmentForms mutation */
      importOneTrustAssessmentForms: {
        /** Created Assessment Forms */
        assessmentForms: AssessmentForm[];
      };
    }>(transcend, IMPORT_ONE_TRUST_ASSESSMENT_FORMS, {
      input,
    });
  } catch (e) {
    logger.error(
      colors.red(
        `Failed to sync assessment ${index + 1} of ${total} to Transcend.\n` +
          `\tAssessment Title: ${assessment.name}. Template Title: ${assessment.template.name}\n`,
      ),
    );
  }
};
