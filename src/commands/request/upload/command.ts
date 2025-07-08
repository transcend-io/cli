import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';

export const uploadCommand = buildCommand({
  loader: async () => {
    const { upload } = await import('./impl');
    return upload;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.MakeDataSubjectRequest,
          ScopeName.ViewRequestIdentitySettings,
          ScopeName.ViewGlobalAttributes,
        ],
      }),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the CSV file of requests to upload',
        default: './requests.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
      cacheFilepath: {
        kind: 'parsed',
        parse: String,
        brief:
          'The path to the JSON file encoding the metadata used to map the CSV shape to Transcend API',
        default: './transcend-privacy-requests-cache.json',
      },
      requestReceiptFolder: {
        kind: 'parsed',
        parse: String,
        brief:
          'The path to the folder where receipts of each upload are stored',
        default: './privacy-request-upload-receipts',
      },
      sombraAuth: createSombraAuthParameter(),
      concurrency: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The concurrency to use when uploading requests in parallel',
        default: '50',
      },
      attributes: {
        kind: 'parsed',
        parse: String,
        brief:
          'Tag all of the requests with the following attributes. Format: key1:value1;value2,key2:value3;value4',
        default: 'Tags:transcend-cli',
      },
      isTest: {
        kind: 'boolean',
        brief:
          'Flag whether the requests being uploaded are test requests or regular requests',
        default: false,
      },
      isSilent: {
        kind: 'boolean',
        brief:
          'Flag whether the requests being uploaded should be submitted in silent mode',
        default: true,
      },
      skipSendingReceipt: {
        kind: 'boolean',
        brief: 'Flag whether to skip sending of the receipt email',
        default: false,
      },
      emailIsVerified: {
        kind: 'boolean',
        brief:
          'Indicate whether the email address being uploaded is pre-verified. Set to false to send a verification email',
        default: true,
      },
      skipFilterStep: {
        kind: 'boolean',
        brief: 'When true, skip the interactive step to filter down the CSV',
        default: false,
      },
      dryRun: {
        kind: 'boolean',
        brief:
          'When true, perform a dry run of the upload instead of calling the API to submit the requests',
        default: false,
      },
      debug: {
        kind: 'boolean',
        brief: 'Debug logging',
        default: false,
      },
      defaultPhoneCountryCode: {
        kind: 'parsed',
        parse: String,
        brief:
          'When uploading phone numbers, if the phone number is missing a country code, assume this country code',
        default: '1',
      },
    },
  },
  docs: {
    brief: 'Upload a set of requests from a CSV',
    fullDescription: `If you need to upload a set of requests from a CSV, you can run this command.
This command uses inquirer to prompt the user to map the shape of the CSV to the shape of the Transcend API. There is no requirement for the shape of the incoming CSV, as the script will handle the mapping process.

The script will also produce a JSON cache file, that allows for the mappings to be preserved between runs.`,
  },
});
