import colors from 'colors';
import { difference } from 'lodash-es';
import { StoredApiKey } from '../../codecs';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import { buildTranscendGraphQLClient, fetchConsentManager } from '../graphql';
import { domainToHost } from './domainToHost';

/**
 * Sync group configuration mapping
 * e.g.
 * {
 *   "abdb5e78-0d69-4554-a3bd-84b72ca3b3d9": [
 *      "test.com"
 *   ],
 *   "f6b3ba87-c9df-444f-b420-6fac49e35910": [
 *     "blue.com"
 *   ]
 * }
 */
export type XdiSyncGroups = { [k in string]: string[] };

/** Regular expression for IP addresses - remove these from sync endpoint */
export const IP_ADDRESS_REGEX =
  // eslint-disable-next-line max-len
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Build the sync endpoint definition for a set of Transcend accounts
 *
 * @param apiKeys - The API keys that will be used to pull down configurations for
 * @param options - Options
 * @returns The XDI configuration
 */
export async function buildXdiSyncEndpoint(
  apiKeys: string | StoredApiKey[],
  {
    xdiLocation,
    transcendUrl = DEFAULT_TRANSCEND_API,
    removeIpAddresses = true,
    domainBlockList = ['localhost'],
    xdiAllowedCommands = 'ConsentManager:Sync',
  }: {
    /** The file location where the XDI file is hosted */
    xdiLocation: string;
    /** URL of Transcend API */
    transcendUrl?: string;
    /** When true, remove IP addresses (defaults to true) */
    removeIpAddresses?: boolean;
    /** Block list of domains to omit from sync endpoint - includes `localhost` by default */
    domainBlockList?: string[];
    /** Allows XDI commands */
    xdiAllowedCommands?: string;
  },
): Promise<{
  /** Sync group configurations */
  syncGroups: XdiSyncGroups;
  /** The HTML string */
  html: string;
}> {
  // Convert API keys to list
  const apiKeysAsList = Array.isArray(apiKeys)
    ? apiKeys
    : [{ apiKey: apiKeys, organizationId: '', organizationName: '' }];

  // Fetch configuration for each account
  const consentManagers = await map(
    apiKeysAsList,
    async (apiKey) => {
      logger.info(
        colors.magenta(
          `Pulling consent metadata for organization - ${apiKey.organizationName}`,
        ),
      );

      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKey.apiKey);

      // Grab consent manager
      const consentManager = await fetchConsentManager(client);
      return consentManager;
    },
    { concurrency: 5 },
  );

  // construct the sync groups
  const syncGroups: XdiSyncGroups = {};
  consentManagers.forEach((consentManager) => {
    // grab the partition key
    const partitionKey =
      // take explicit key first
      consentManager.partition?.partition ||
      // fallback to bundle ID
      consentManager.bundleURL.split('/').reverse()[1];

    // Ensure that partition exists in the sync groups
    if (!syncGroups[partitionKey]) {
      syncGroups[partitionKey] = [];
    }

    // Map domain list to a host list
    const hosts = difference(
      consentManager.configuration.domains
        .filter(
          // ignore IP addresses
          (domain) => !removeIpAddresses || !IP_ADDRESS_REGEX.test(domain),
        )
        .map((domain) => domainToHost(domain)),
      // ignore block list
      domainBlockList,
    );
    // merge existing sync group with hosts for this consent manager
    syncGroups[partitionKey] = [
      ...new Set([...(syncGroups[partitionKey] || []), ...hosts]),
    ];
  });

  // Construct the HTML
  const syncEndpointHtml = `
<!DOCTYPE html>
<script
src="${xdiLocation}"
data-sync-groups='${JSON.stringify(syncGroups, null, 2)}'
data-xdi-commands="${xdiAllowedCommands}"
></script>
`;

  return {
    html: syncEndpointHtml,
    syncGroups,
  };
}
