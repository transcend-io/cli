import {
  TranscendInput,
  ApiKeyInput,
  DataSiloInput,
  EnricherInput,
} from './codecs';
import { GraphQLClient } from 'graphql-request';
import flatten from 'lodash/flatten';
import { fetchEnrichedDataSilos } from './syncDataSilos';
import {
  convertToDataSubjectAllowlist,
  fetchDataSubjects,
} from './fetchDataSubjects';
import { fetchApiKeys } from './fetchApiKeys';
import { fetchAllEnrichers } from './syncEnrichers';

/**
 * Pull a yaml configuration from Transcend
 *
 * @param client - GraphQL client
 * @param dataSiloIds - The data silos to sync. If empty list, pull all.
 * @returns The configuration
 */
export async function pullTranscendConfiguration(
  client: GraphQLClient,
  dataSiloIds: string[],
): Promise<TranscendInput> {
  const [dataSubjects, apiKeyTitleMap, dataSilos, enrichers] =
    await Promise.all([
      // Grab all data subjects in the organization
      fetchDataSubjects({}, client, true),
      // Grab API keys
      fetchApiKeys({}, client, true),
      // Fetch the data silos
      fetchEnrichedDataSilos(client, { ids: dataSiloIds }),
      // Fetch enrichers
      fetchAllEnrichers(client),
    ]);

  const result: TranscendInput = {};

  // Save API keys
  const apiKeyTitles = flatten(
    dataSilos.map(({ apiKeys }) => apiKeys.map(({ title }) => title)),
  );
  const relevantApiKeys = Object.values(apiKeyTitleMap).filter(({ title }) =>
    apiKeyTitles.includes(title),
  );
  if (relevantApiKeys.length > 0) {
    result['api-keys'] = Object.values(apiKeyTitleMap)
      .filter(({ title }) => apiKeyTitles.includes(title))
      .map(
        ({ title }): ApiKeyInput => ({
          title,
        }),
      );
  }

  // Save enrichers
  if (enrichers.length > 0 && dataSiloIds.length === 0) {
    result.enrichers = enrichers
      .filter(({ type }) => type === 'SERVER')
      .map(
        ({
          title,
          url,
          inputIdentifier,
          identifiers,
          actions,
        }): EnricherInput => ({
          title,
          url,
          'input-identifier': inputIdentifier.name,
          'output-identifiers': identifiers.map(({ name }) => name),
          'privacy-actions': actions,
        }),
      );
  }

  // Save data silos
  result['data-silos'] = dataSilos.map(
    ({
      title,
      description,
      url,
      apiKeys,
      identifiers,
      dependentDataSilos,
      owners,
      dataPoints,
      subjectBlocklist,
      globalActions,
      isLive,
    }): DataSiloInput => ({
      title,
      description,
      url: url || undefined,
      'api-key-title': apiKeys[0]?.title,
      'identity-keys': identifiers.map(({ name }) => name),
      'deletion-dependencies': dependentDataSilos.map(({ title }) => title),
      owners: owners.map(({ email }) => email),
      disabled: !isLive,
      'privacy-actions': globalActions
        .filter(({ active }) => active)
        .map(({ type }) => type),
      'data-subjects':
        subjectBlocklist.length > 0
          ? convertToDataSubjectAllowlist(
              subjectBlocklist.map(({ type }) => type),
              dataSubjects,
            )
          : undefined,
      datapoints: dataPoints.map((dataPoint) => ({
        title: dataPoint.title.defaultMessage,
        description: dataPoint.description.defaultMessage,
        key: dataPoint.name,
        purpose: dataPoint.purpose,
        category: dataPoint.category,
        'privacy-actions': dataPoint.actionSettings
          .filter(({ active }) => active)
          .map(({ type }) => type),
      })),
    }),
  );

  return result;
}
