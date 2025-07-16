import { buildCommand } from '@stricli/core';
import { createTranscendUrlParameter } from '../../../lib/cli/common-parameters';
import { uuidParser } from '../../../lib/cli/parsers';

export const generateApiKeysCommand = buildCommand({
  loader: async () => {
    const { generateApiKeys } = await import('./impl');
    return generateApiKeys;
  },
  parameters: {
    flags: {
      email: {
        kind: 'parsed',
        parse: String,
        brief: 'The email address that you use to log into Transcend',
      },
      password: {
        kind: 'parsed',
        parse: String,
        brief: 'The password for your account login',
      },
      apiKeyTitle: {
        kind: 'parsed',
        parse: String,
        brief: 'The title of the API key being generated or destroyed',
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'The file where API keys should be written to',
      },
      scopes: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The list of scopes that should be given to the API key',
      },
      deleteExistingApiKey: {
        kind: 'boolean',
        brief:
          'When true, if an API key exists with the specified apiKeyTitle, the existing API key is deleted',
        default: true,
      },
      createNewApiKey: {
        kind: 'boolean',
        brief:
          'When true, new API keys will be created. Set to false if you simply want to delete all API keys with a title',
        default: true,
      },
      parentOrganizationId: {
        kind: 'parsed',
        parse: uuidParser,
        brief:
          'Filter for only a specific organization by ID, returning all child accounts associated with that organization',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Generate API keys',
    fullDescription: `This command allows for creating API keys across multiple Transcend instances. This is useful for customers that are managing many Transcend instances and need to regularly create, cycle or delete API keys across all of their instances.

Unlike the other commands that rely on API key authentication, this command relies upon username/password authentication. This command will spit out the API keys into a JSON file, and that JSON file can be used in subsequent CLI commands.

Authentication requires your email and password for the Transcend account. This command will only generate API keys for Transcend instances where you have the permission to "Manage API Keys".`,
  },
});
