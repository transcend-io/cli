import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { SyncOtCommandFlags } from './impl';

const examples = buildExamples<SyncOtCommandFlags>(
  ['migration', 'sync-ot'],
  [
    {
      description:
        'Syncs all assessments from the OneTrust instance to Transcend',
      flags: {
        hostname: 'trial.onetrust.com',
        oneTrustAuth: '$ONE_TRUST_OAUTH_TOKEN',
        transcendAuth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description:
        'Set dryRun to true and sync the resource to disk (writes out file to ./oneTrustAssessments.json)',
      flags: {
        hostname: 'trial.onetrust.com',
        oneTrustAuth: '$ONE_TRUST_OAUTH_TOKEN',
        dryRun: 'true',
        file: './oneTrustAssessments.json',
      },
    },
    {
      description: 'Sync to Transcend by reading from file instead of OneTrust',
      flags: {
        source: 'file',
        file: './oneTrustAssessments.json',
        transcendAuth: '$TRANSCEND_API_KEY',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
