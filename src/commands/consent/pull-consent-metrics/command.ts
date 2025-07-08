import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';
import { dateParser } from '../../../cli/parsers';

export const pullConsentMetricsCommand = buildCommand({
  loader: async () => {
    const { pullConsentMetrics } = await import('./impl');
    return pullConsentMetrics;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewConsentManager],
      }),
      start: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'The start date to pull metrics from',
      },
      end: {
        kind: 'parsed',
        parse: dateParser,
        brief: 'The end date to pull metrics until',
        optional: true,
      },
      folder: {
        kind: 'parsed',
        parse: String,
        brief: 'The folder to save metrics to',
        default: './consent-metrics/',
      },
      bin: {
        kind: 'parsed',
        parse: String,
        brief: 'The bin metric when pulling data (1h or 1d)',
        default: '1d',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Pull consent metrics',
    fullDescription: `This command allows for pulling consent manager metrics for a Transcend account, or a set of Transcend accounts.`,
  },
});
