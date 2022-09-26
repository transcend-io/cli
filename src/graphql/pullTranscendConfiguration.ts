import {
  TranscendInput,
  ApiKeyInput,
  DataSiloInput,
  EnricherInput,
} from '../codecs';
import { GraphQLClient } from 'graphql-request';
import flatten from 'lodash/flatten';
import keyBy from 'lodash/keyBy';
import mapValues from 'lodash/mapValues';
import { fetchEnrichedDataSilos } from './syncDataSilos';
import {
  convertToDataSubjectAllowlist,
  fetchDataSubjects,
} from './fetchDataSubjects';
import { fetchApiKeys } from './fetchApiKeys';
import { fetchAllEnrichers } from './syncEnrichers';
import { fetchAllTemplates } from '.';
import { formatAttributeValues } from './formatAttributeValues';

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
  const [dataSubjects, apiKeyTitleMap, dataSilos, enrichers, templates] =
    await Promise.all([
      // Grab all data subjects in the organization
      fetchDataSubjects({}, client, true),
      // Grab API keys
      fetchApiKeys({}, client, true),
      // Fetch the data silos
      fetchEnrichedDataSilos(client, { ids: dataSiloIds }),
      // Fetch enrichers
      fetchAllEnrichers(client),
      // Fetch email templates
      fetchAllTemplates(client),
    ]);

  const result: TranscendInput = {};

  // Save API keys
  const apiKeyTitles = flatten(
    dataSilos.map(([{ apiKeys }]) => apiKeys.map(({ title }) => title)),
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

  // save email templates
  if (dataSiloIds.length === 0) {
    result.templates = templates.map(({ title }) => ({ title }));
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
    ([
      {
        title,
        description,
        url,
        type,
        apiKeys,
        notifyEmailAddress,
        identifiers,
        dependentDataSilos,
        owners,
        teams,
        subjectBlocklist,
        isLive,
        promptAVendorEmailSendFrequency,
        promptAVendorEmailSendType,
        promptAVendorEmailIncludeIdentifiersAttachment,
        promptAVendorEmailCompletionLinkType,
        manualWorkRetryFrequency,
        catalog,
        attributeValues,
      },
      dataPoints,
    ]): DataSiloInput => ({
      title,
      description,
      integrationName: type,
      url: url || undefined,
      'api-key-title': apiKeys[0]?.title,
      'identity-keys': identifiers
        .filter(({ isConnected }) => isConnected)
        .map(({ name }) => name),
      ...(dependentDataSilos.length > 0
        ? {
            'deletion-dependencies': dependentDataSilos.map(
              ({ title }) => title,
            ),
          }
        : {}),
      ...(owners.length > 0
        ? { owners: owners.map(({ email }) => email) }
        : {}),
      ...(teams.length > 0 ? { teams: teams.map(({ name }) => name) } : {}),
      disabled: !isLive,
      'data-subjects':
        subjectBlocklist.length > 0
          ? convertToDataSubjectAllowlist(
              subjectBlocklist.map(({ type }) => type),
              dataSubjects,
            )
          : undefined,
      ...(catalog.hasAvcFunctionality
        ? {
            'email-settings': {
              'notify-email-address': notifyEmailAddress || undefined,
              'send-frequency': promptAVendorEmailSendFrequency,
              'send-type': promptAVendorEmailSendType,
              'include-identifiers-attachment':
                promptAVendorEmailIncludeIdentifiersAttachment,
              'completion-link-type': promptAVendorEmailCompletionLinkType,
              'manual-work-retry-frequency': manualWorkRetryFrequency,
            },
          }
        : {}),
      attributes:
        attributeValues !== undefined && attributeValues.length > 0
          ? formatAttributeValues(attributeValues)
          : undefined,

      datapoints: dataPoints
        .map((dataPoint) => ({
          key: dataPoint.name,
          title: dataPoint.title?.defaultMessage,
          description: dataPoint.description?.defaultMessage,
          ...(dataPoint.path.length > 0 ? { path: dataPoint.path } : {}),
          ...(dataPoint.dataCollection?.title
            ? {
                'data-collection-tag':
                  dataPoint.dataCollection.title.defaultMessage,
              }
            : {}),
          ...(dataPoint.dbIntegrationQueries.length > 0
            ? {
                'privacy-action-queries': mapValues(
                  keyBy(dataPoint.dbIntegrationQueries, 'requestType'),
                  (databaseIntegrationQuery) =>
                    databaseIntegrationQuery.suggestedQuery ||
                    databaseIntegrationQuery.query,
                ),
              }
            : {}),
          ...(dataPoint.subDataPoints.length > 0
            ? {
                fields: dataPoint.subDataPoints
                  .map((field) => ({
                    key: field.name,
                    description: field.description,
                    purposes: field.purposes,
                    categories: field.categories,
                    'access-request-visibility-enabled':
                      field.accessRequestVisibilityEnabled,
                    'erasure-request-redaction-enabled':
                      field.erasureRequestRedactionEnabled,
                    attributes:
                      field.attributeValues !== undefined &&
                      field.attributeValues.length > 0
                        ? formatAttributeValues(field.attributeValues)
                        : undefined,
                  }))
                  .sort((a, b) => a.key.localeCompare(b.key)),
              }
            : {}),
          'privacy-actions': dataPoint.actionSettings
            .filter(({ active }) => active)
            .map(({ type }) => type),
        }))
        .sort((a, b) =>
          [...(a.path ?? []), a.key]
            .join('.')
            .localeCompare([...(b.path ?? []), b.key].join('.')),
        ),
    }),
  );
  return result;
}
