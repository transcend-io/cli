import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import { logger } from '../../logger';

import { createReadStream } from 'fs';
import * as readline from 'readline';
import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import { syncOneTrustAssessmentToTranscend } from './syncOneTrustAssessmentToTranscend';
import { GraphQLClient } from 'graphql-request';

/**
 * Reads assessments from a file and syncs them to Transcend.
 *
 * @param param - the information about the source file and Transcend instance to write them to.
 */
export const syncOneTrustAssessmentsFromFile = async ({
  transcend,
  file,
}: {
  /** the Transcend client instance */
  transcend: GraphQLClient;
  /** The name of the file from which to read the OneTrust assessments */
  file: string;
}): Promise<void> => {
  logger.info(`Getting list of all assessments from file ${file}...`);

  // Create a readable stream from the file
  const fileStream = createReadStream(file, {
    encoding: 'utf-8',
    highWaterMark: 64 * 1024, // 64KB chunks
  });

  // Create readline interface
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let index = 0;

  const indices = [
    39, 154, 564, 578, 587, 1080, 1242, 1379, 1390, 1439, 1693, 1797, 1816,
    1947, 2020, 2066,
  ];

  // Process the file line by line
  // eslint-disable-next-line no-restricted-syntax
  for await (const line of rl) {
    try {
      // FIXME: remove indices
      // Parse each non-empty line and sync to transcend
      if (indices.includes(index + 1) && line.trim()) {
        const parsedAssessment = decodeCodec(
          OneTrustEnrichedAssessment,
          line.endsWith(',') ? line.slice(0, -1) : line,
        );

        await syncOneTrustAssessmentToTranscend({
          assessment: parsedAssessment,
          transcend,
          total: 2178,
          index,
        });
      }
      index += 1;
    } catch (parseError) {
      // if failed to parse a line, report error and continue
      logger.error(
        colors.red(
          `Failed to parse the line ${index} from file '${file}': ${parseError.message}.`,
        ),
      );
    }
  }
};
