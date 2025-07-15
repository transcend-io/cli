import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';
import { dateParser } from '../../../lib/cli/parsers';

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
    fullDescription: `This command allows for pulling consent manager metrics for a Transcend account, or a set of Transcend accounts.

By default, the consent metrics will be written to a folder named \`consent-metrics\` within the directory where you run the command. You can override the location that these CSVs are written to using the flag \`--folder=./my-folder/\`. This folder will contain a set of CSV files:

- \`CONSENT_CHANGES_TIMESERIES_optIn.csv\` -> this is a feed containing the number of explicit opt in events that happen - these are calls to \`airgap.setConsent(event, { SaleOfInfo: true });\`
- \`CONSENT_CHANGES_TIMESERIES_optOut.csv\` -> this is a feed containing the number of explicit opt out events that happen - these are calls to \`airgap.setConsent(event, { SaleOfInfo: false });\`
- \`CONSENT_SESSIONS_BY_REGIME_Default.csv\` -> this contains the number of sessions detected for the bin period
- \`PRIVACY_SIGNAL_TIMESERIES_DNT.csv\` -> the number of DNT signals detected.
- \`PRIVACY_SIGNAL_TIMESERIES_GPC.csv\` -> the number of GPC signals detected.`,
  },
});
