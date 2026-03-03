import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

export const configurePreferenceUploadCommand = buildCommand({
  loader: async () => {
    const { configurePreferenceUpload } = await import('./impl');
    return configurePreferenceUpload;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [
          ScopeName.ViewPreferenceStoreSettings,
          ScopeName.ViewRequestIdentitySettings,
        ],
      }),
      sombraAuth: createSombraAuthParameter(),
      transcendUrl: createTranscendUrlParameter(),
      directory: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the directory of CSV files to scan for column headers and unique values',
      },
      schemaFilePath: {
        kind: 'parsed',
        parse: String,
        brief:
          'Path to the config JSON file. Defaults to <directory>/../preference-upload-schema.json',
        optional: true,
      },
      partition: {
        kind: 'parsed',
        parse: String,
        brief: 'The partition key for the preference store',
      },
    },
  },
  docs: {
    brief:
      'Interactively configure the column mapping for preference CSV uploads',
    fullDescription: `Interactively configure the column mapping for preference CSV uploads.

Scans ALL CSV files in the given directory to discover every column header
and every unique value per column, then walks through an interactive editor
to build the full mapping config (identifiers, ignored columns, timestamp,
purposes/preferences and their value mappings).

The resulting config JSON is reused by 'upload-preferences' so subsequent
uploads run fully non-interactively.`,
  },
});
