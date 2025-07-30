import { OneTrustPullSource } from '../../../enums';
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
        dryRun: true,
        file: './oneTrustAssessments.json',
      },
    },
    {
      description: 'Sync to Transcend by reading from file instead of OneTrust',
      flags: {
        source: OneTrustPullSource.File,
        file: './oneTrustAssessments.json',
        transcendAuth: '$TRANSCEND_API_KEY',
      },
    },
  ],
);

export default `#### Authentication

In order to use this command, you will need to generate a OneTrust OAuth Token with scope for accessing the following endpoints:

- [GET /v2/assessments](https://developer.onetrust.com/onetrust/reference/getallassessmentbasicdetailsusingget)
- [GET /v2/assessments/{assessmentId}/export](https://developer.onetrust.com/onetrust/reference/exportassessmentusingget)
- [GET /risks/{riskId}](https://developer.onetrust.com/onetrust/reference/getriskusingget)
- [GET /v2/Users/{userId}](https://developer.onetrust.com/onetrust/reference/getuserusingget)

To learn how to generate the token, see the [OAuth 2.0 Scopes](https://developer.onetrust.com/onetrust/reference/oauth-20-scopes) and [Generate Access Token](https://developer.onetrust.com/onetrust/reference/getoauthtoken) pages.

#### Examples

${examples}`;
