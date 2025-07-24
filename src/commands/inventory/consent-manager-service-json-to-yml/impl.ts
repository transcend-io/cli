import type { LocalContext } from '../../../context';
import * as t from 'io-ts';
import { writeTranscendYaml } from '../../../lib/readTranscendYaml';
import colors from 'colors';
import { logger } from '../../../logger';
import { existsSync, readFileSync } from 'fs';
import { decodeCodec } from '@transcend-io/type-utils';
import {
  ConsentManagerServiceMetadata,
  CookieInput,
  DataFlowInput,
} from '../../../codecs';
import {
  ConsentTrackerStatus,
  DataFlowScope,
} from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface ConsentManagerServiceJsonToYmlCommandFlags {
  file: string;
  output: string;
}

export function consentManagerServiceJsonToYml(
  this: LocalContext,
  { file, output }: ConsentManagerServiceJsonToYmlCommandFlags,
): void {
  doneInputValidation(this.process.exit);

  // Ensure files exist
  if (!existsSync(file)) {
    logger.error(colors.red(`File does not exist: --file="${file}"`));
    this.process.exit(1);
  }

  // Read in each consent manager configuration
  const services = decodeCodec(
    t.array(ConsentManagerServiceMetadata),
    readFileSync(file, 'utf-8'),
  );

  // Create data flows and cookie configurations
  const dataFlows: DataFlowInput[] = [];
  const cookies: CookieInput[] = [];
  services.forEach((service) => {
    service.dataFlows
      .filter(({ type }) => type !== DataFlowScope.CSP)
      .forEach((dataFlow) => {
        dataFlows.push({
          value: dataFlow.value,
          type: dataFlow.type,
          status: ConsentTrackerStatus.Live,
          trackingPurposes: dataFlow.trackingPurposes,
        });
      });

    service.cookies.forEach((cookie) => {
      cookies.push({
        name: cookie.name,
        status: ConsentTrackerStatus.Live,
        trackingPurposes: cookie.trackingPurposes,
      });
    });
  });

  // write to disk
  writeTranscendYaml(output, {
    'data-flows': dataFlows,
    cookies,
  });

  logger.info(
    colors.green(
      `Successfully wrote ${dataFlows.length} data flows and ${cookies.length} cookies to file "${output}"`,
    ),
  );
}
