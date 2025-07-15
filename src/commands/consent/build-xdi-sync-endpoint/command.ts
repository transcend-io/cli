import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/lib/cli/common-parameters';
import { arrayParser } from '@/lib/cli/parsers';

export const buildXdiSyncEndpointCommand = buildCommand({
  loader: async () => {
    const { buildXdiSyncEndpoint } = await import('./impl');
    return buildXdiSyncEndpoint;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewConsentManager],
      }),
      xdiLocation: {
        kind: 'parsed',
        parse: String,
        brief:
          'The location of the XDI that will be loaded by the generated sync endpoint',
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'The HTML file path where the sync endpoint should be written',
        default: './sync-endpoint.html',
      },
      removeIpAddresses: {
        kind: 'boolean',
        brief: 'When true, remove IP addresses from the domain list',
        default: true,
      },
      domainBlockList: {
        kind: 'parsed',
        parse: arrayParser,
        brief:
          'The set of domains that should be excluded from the sync endpoint. Comma-separated list.',
        default: 'localhost',
      },
      xdiAllowedCommands: {
        kind: 'parsed',
        parse: String,
        brief: 'The allowed set of XDI commands',
        default: 'ConsentManager:Sync',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Build XDI sync endpoint',
    fullDescription:
      'This command allows for building of the XDI Sync Endpoint across a set of Transcend accounts.',
  },
});
