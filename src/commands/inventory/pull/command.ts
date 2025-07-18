import { buildCommand, numberParser } from '@stricli/core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { TranscendPullResource } from '../../../enums';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

export const DEFAULT_TRANSCEND_PULL_RESOURCES = [
  TranscendPullResource.DataSilos,
  TranscendPullResource.Enrichers,
  TranscendPullResource.Templates,
  TranscendPullResource.ApiKeys,
];

export const DEFAULT_CONSENT_TRACKER_STATUSES =
  Object.values(ConsentTrackerStatus);

export const pullCommand = buildCommand({
  loader: async () => {
    const { pull } = await import('./impl');
    return pull;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: 'Varies',
      }),
      resources: {
        kind: 'enum',
        values: ['all', ...Object.values(TranscendPullResource)],
        brief: `The different resource types to pull in. Defaults to ${DEFAULT_TRANSCEND_PULL_RESOURCES.join(
          ',',
        )}.`,
        variadic: ',',
        optional: true,
      },
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the YAML file to pull into',
        default: './transcend.yml',
      },
      transcendUrl: createTranscendUrlParameter(),
      dataSiloIds: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief:
          'The UUIDs of the data silos that should be pulled into the YAML file',
        optional: true,
      },
      integrationNames: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'The types of integrations to pull down',
        optional: true,
      },
      trackerStatuses: {
        kind: 'enum',
        values: Object.values(ConsentTrackerStatus),
        variadic: ',',
        brief:
          'The statuses of consent manager trackers to pull down. Defaults to all statuses.',
        optional: true,
      },
      pageSize: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The page size to use when paginating over the API',
        default: '50',
      },
      skipDatapoints: {
        kind: 'boolean',
        brief:
          'When true, skip pulling in datapoints alongside data silo resource',
        default: false,
      },
      skipSubDatapoints: {
        kind: 'boolean',
        brief:
          'When true, skip pulling in subDatapoints alongside data silo resource',
        default: false,
      },
      includeGuessedCategories: {
        kind: 'boolean',
        brief:
          'When true, included guessed data categories that came from the content classifier',
        default: false,
      },
      debug: {
        kind: 'boolean',
        brief:
          'Set to true to include debug logs while pulling the configuration',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Pull metadata from Transcend into transcend.yml',
    fullDescription: `Generates a transcend.yml by pulling the configuration from your Transcend instance.

The API key needs various scopes depending on the resources being pulled (see the CLI's README for more details).

This command can be helpful if you are looking to:

- Copy your data into another instance
- Generate a transcend.yml file as a starting point to maintain parts of your data inventory in code.`,
  },
});
