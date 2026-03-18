import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { UploadCommandFlags } from './impl';

const examples = buildExamples<UploadCommandFlags>(
  ['request', 'upload'],
  [
    {
      description: 'Upload requests from a CSV file',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
      },
    },
    {
      description: 'For self-hosted sombras that use an internal key',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        file: '/Users/transcend/Desktop/test.csv',
      },
    },
    {
      description: 'Run without being prompted to filter requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        skipFilterStep: true,
      },
    },
    {
      description:
        'Perform a dry run to see what will be uploaded, without calling the Transcend API',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        dryRun: true,
      },
    },
    {
      description: 'Mark the uploaded requests as test requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        isTest: true,
      },
    },
    {
      description:
        'Send email communications to the users throughout the request lifecycle',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        isSilent: false,
      },
    },
    {
      description:
        'Upload requests without sending initial email receipt, but still send later emails',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        skipSendingReceipt: true,
      },
    },
    {
      description: 'Increase the concurrency (defaults to 50)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        concurrency: 100,
      },
    },
    {
      description: 'Specify default country code for phone numbers',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        defaultPhoneCountryCode: '44',
      },
    },
    {
      description: 'Include debug logs - warning, this logs out personal data',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        debug: true,
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Send email verification to user before request continues',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        isSilent: false,
        emailIsVerified: false,
      },
    },
    {
      description:
        'Tag all uploaded requests with custom fields (formerly known as "attributes")',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: '/Users/transcend/Desktop/test.csv',
        attributes: 'Tags:transcend-cli;my-customer-tag,Customer:acme-corp',
      },
    },
  ],
);

export default `See a demo of the interactive mapping processbelow (_note: the command is slightly different from the one shown in the video, but the arguments are the same._)

https://user-images.githubusercontent.com/10264973/205477183-d4762087-668c-43f1-a84c-0fce0ec3e132.mov

#### Examples

${examples}`;
