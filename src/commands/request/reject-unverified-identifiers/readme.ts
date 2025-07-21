import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { RejectUnverifiedIdentifiersCommandFlags } from './impl';

const examples = buildExamples<RejectUnverifiedIdentifiersCommandFlags>(
  ['request', 'reject-unverified-identifiers'],
  [
    {
      description: 'Bulk clear out any request identifiers that are unverified',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        identifierNames: 'phone',
      },
    },
    {
      description: 'Restart specific request types',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        identifierNames: 'phone',
        actions: 'ACCESS,ERASURE',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        identifierNames: 'phone',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Usage

${examples}`;
