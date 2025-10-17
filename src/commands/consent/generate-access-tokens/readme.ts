import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { GenerateAccessTokenCommandFlags } from './impl';

const examples = buildExamples<GenerateAccessTokenCommandFlags>(
  ['consent', 'generate-access-tokens'],
  [
    {
      description:
        'Generate access tokens for users as the "customer" subject type',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './users.csv',
        subjectType: 'customer',
      },
    },
    {
      description:
        'Use natural-language duration (parsed to milliseconds) — e.g. 1 month',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './users.csv',
        subjectType: 'customer',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        duration: '1 month' as any,
      },
    },
    {
      description:
        'CSV with custom column names for email/coreIdentifier + a 90-day duration',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './my-users.csv',
        subjectType: 'employee',
        emailColumnName: 'user_email',
        coreIdentifierColumnName: 'crm_id',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        duration: '90 days' as any,
      },
    },
    {
      description:
        'Specifying the backend URL (US-hosted backend infrastructure)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './users.csv',
        subjectType: 'customer',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `
Learn more about generating access tokens in the Transcend Docs:
https://docs.transcend.io/docs/articles/preference-management/access-links

#### Examples

${examples}`;
