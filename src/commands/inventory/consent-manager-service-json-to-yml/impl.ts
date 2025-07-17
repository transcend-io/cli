import { existsSync, readFileSync } from 'node:fs';
import {
  ConsentTrackerStatus,
  DataFlowScope,
} from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import * as t from 'io-ts';
import {
  ConsentManagerServiceMetadata,
  CookieInput,
  DataFlowInput,
} from '../../../codecs';
import type { LocalContext } from '../../../context';
import { writeTranscendYaml } from '../../../lib/readTranscendYaml';
import { logger } from '../../../logger';

interface ConsentManagerServiceJsonToYmlCommandFlags {
  file: string;
  output: string;
}

export function consentManagerServiceJsonToYml(
  this: LocalContext,
  { file, output }: ConsentManagerServiceJsonToYmlCommandFlags,
): void {
  // Ensure files exist
  if (!existsSync(file)) {
    logger.error(colors.red(`File does not exist: --file="${file}"`));
    process.exit(1);
  }

  // Read in each consent manager configuration
  const services = decodeCodec(
    t.array(ConsentManagerServiceMetadata),
    readFileSync(file, 'utf8'),
  );

  // Create data flows and cookie configurations
  const dataFlows: DataFlowInput[] = [];
  const cookies: CookieInput[] = [];
  for (const service of services) {
    for (const dataFlow of service.dataFlows.filter(
      ({ type }) => type !== DataFlowScope.CSP,
    )) {
      dataFlows.push({
        value: dataFlow.value,
        type: dataFlow.type,
        status: ConsentTrackerStatus.Live,
        trackingPurposes: dataFlow.trackingPurposes,
      });
    }

    for (const cookie of service.cookies) {
      cookies.push({
        name: cookie.name,
        status: ConsentTrackerStatus.Live,
        trackingPurposes: cookie.trackingPurposes,
      });
    }
  }

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
