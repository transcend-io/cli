import { logger } from '../logger';
import keyBy from 'lodash/keyBy';
import colors from 'colors';
import { OneTrustFileFormat } from '../enums';
import {
  OneTrustAssessmentCodec,
  OneTrustGetAssessmentResponseCodec,
  OneTrustGetRiskResponseCodec,
} from './codecs';
import fs from 'fs';
import { flattenOneTrustAssessment } from './flattenOneTrustAssessment';

/**
 * Write the assessment to disk at the specified file path.
 *
 *
 * @param param - information about the assessment to write
 */
export const writeOneTrustAssessment = ({
  file,
  fileFormat,
  assessment,
  assessmentDetails,
  riskDetails,
  index,
  total,
}: {
  /** The file path to write the assessment to */
  file: string;
  /** The format of the output file */
  fileFormat: OneTrustFileFormat;
  /** The basic assessment */
  assessment: OneTrustAssessmentCodec;
  /** The assessment with details  */
  assessmentDetails: OneTrustGetAssessmentResponseCodec;
  /** The details of risks found within the assessment */
  riskDetails: OneTrustGetRiskResponseCodec[];
  /** The index of the assessment being written to the file */
  index: number;
  /** The total amount of assessments that we will write */
  total: number;
}): void => {
  logger.info(
    colors.magenta(
      `Syncing enriched assessment ${
        index + 1
      } of ${total} to file "${file}"...`,
    ),
  );

  // enrich the sections with risk details
  const riskDetailsById = keyBy(riskDetails, 'id');
  const { sections, ...restAssessmentDetails } = assessmentDetails;
  const enrichedSections = sections.map((section) => {
    const { questions, ...restSection } = section;
    const enrichedQuestions = questions.map((question) => {
      const { risks, ...restQuestion } = question;
      const enrichedRisks = (risks ?? []).map((risk) => {
        const details = riskDetailsById[risk.riskId];
        // TODO: missing the risk meta data and links to the assessment
        return {
          ...risk,
          description: details.description,
          name: details.name,
          treatment: details.treatment,
          treatmentStatus: details.treatmentStatus,
          type: details.type,
          state: details.state,
          stage: details.stage,
          result: details.result,
          categories: details.categories,
        };
      });
      return {
        ...restQuestion,
        risks: enrichedRisks,
      };
    });
    return {
      ...restSection,
      questions: enrichedQuestions,
    };
  });

  // combine the two assessments into a single enriched result
  const enrichedAssessment = {
    ...restAssessmentDetails,
    ...assessment,
    sections: enrichedSections,
  };

  // For json format
  if (fileFormat === OneTrustFileFormat.Json) {
    // start with an opening bracket
    if (index === 0) {
      fs.writeFileSync(file, '[\n');
    }

    // const stringifiedAssessment = JSON.stringify(enrichedAssessment, null, 2);

    // // Add comma for all items except the last one
    // const comma = index < total - 1 ? ',' : '';

    // // write to file
    // fs.appendFileSync(file, stringifiedAssessment + comma);

    // // end with closing bracket
    // if (index === total - 1) {
    //   fs.appendFileSync(file, ']');
    // }
  } else if (fileFormat === OneTrustFileFormat.Csv) {
    // flatten the json object
    // start with an opening bracket
    if (index === 0) {
      fs.writeFileSync('./oneTrust.json', '[\n');
    }

    const flattened = flattenOneTrustAssessment(enrichedAssessment);
    const stringifiedFlattened = JSON.stringify(flattened, null, 2);

    // const stringifiedAssessment = JSON.stringify(enrichedAssessment, null, 2);

    // Add comma for all items except the last one
    const comma = index < total - 1 ? ',' : '';

    // write to file
    // fs.appendFileSync(file, stringifiedAssessment + comma);
    fs.appendFileSync('./oneTrust.json', stringifiedFlattened + comma);

    // end with closing bracket
    if (index === total - 1) {
      fs.appendFileSync('./oneTrust.json', ']');
    }
  }
};
