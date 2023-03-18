import {
  TranscendInput,
  ApiKeyInput,
  DataSiloInput,
  AttributeInput,
  EnricherInput,
  DataFlowInput,
  CookieInput,
} from '../codecs';
import {
  AttributeResourceType,
  ENABLED_ON_TO_ATTRIBUTE_KEY,
} from '../tmp-attribute-key';
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
import { fetchAllDataFlows } from './fetchAllDataFlows';
import { fetchAllCookies } from './fetchAllCookies';
import { fetchAllTemplates } from './syncTemplates';
import { fetchAllAttributes } from './fetchAllAttributes';
import { formatAttributeValues } from './formatAttributeValues';
import { logger } from '../logger';
import colors from 'colors';

/**
 * Resources that can be pulled in
 */
export enum TranscendPullResource {
  ApiKeys = 'apiKeys',
  Attributes = 'attributes',
  Templates = 'templates',
  DataSilos = 'dataSilos',
  Enrichers = 'enrichers',
  Vendors = 'vendors',
  BusinessEntities = 'businessEntities',
  DataFlows = 'dataFlows',
  Cookies = 'cookies',
}

export const DEFAULT_TRANSCEND_PULL_RESOURCES = [
  TranscendPullResource.DataSilos,
  TranscendPullResource.Enrichers,
  TranscendPullResource.Templates,
  TranscendPullResource.ApiKeys,
];

export interface TranscendPullConfigurationInput {
  /** Page size */
  pageSize: number;
  /** Enable debug logs */
  debug: boolean;
  /** The data silo IDs to sync. If empty list, pull all. */
  dataSiloIds: string[];
  /** Resources to pull in */
  resources?: TranscendPullResource[];
  /** The data silo types to sync.If empty list, pull all.  */
  integrationNames: string[];
}

/**
 * Pull a yaml configuration from Transcend
 *
 * @param client - GraphQL client
 * @param dataSiloIds - The data silos to sync. If empty list, pull all.
 * @returns The configuration
 */
export async function pullTranscendConfiguration(
  client: GraphQLClient,
  {
    dataSiloIds,
    integrationNames,
    debug,
    resources = DEFAULT_TRANSCEND_PULL_RESOURCES,
    pageSize,
  }: TranscendPullConfigurationInput,
): Promise<TranscendInput> {
  if (dataSiloIds.length > 0 && integrationNames.length > 0) {
    throw new Error(
      'Only 1 of integrationNames OR dataSiloIds can be provided',
    );
  }

  logger.info(colors.magenta(`Fetching data with page size ${pageSize}...`));

  // Fetch all data, but only conditional fetch data that is requested
  // FIXME include ConsentTrackerStatus
  const [
    dataSubjects,
    apiKeyTitleMap,
    dataSilos,
    enrichers,
    dataFlows,
    cookies,
    attributes,
    templates,
  ] = await Promise.all([
    // Grab all data subjects in the organization
    resources.includes(TranscendPullResource.DataSilos)
      ? fetchDataSubjects({}, client, true)
      : {},
    // Grab API keys
    resources.includes(TranscendPullResource.ApiKeys)
      ? fetchApiKeys({}, client, true)
      : [],
    // Fetch the data silos
    resources.includes(TranscendPullResource.DataSilos)
      ? fetchEnrichedDataSilos(client, {
          ids: dataSiloIds,
          integrationNames,
          pageSize,
          debug,
        })
      : [],
    // Fetch enrichers
    resources.includes(TranscendPullResource.Enrichers)
      ? fetchAllEnrichers(client)
      : [],
    // Fetch data flows
    resources.includes(TranscendPullResource.DataFlows)
      ? fetchAllDataFlows(client)
      : [],
    // Fetch data flows
    resources.includes(TranscendPullResource.Cookies)
      ? fetchAllCookies(client)
      : [],
    // Fetch attributes
    resources.includes(TranscendPullResource.Attributes)
      ? fetchAllAttributes(client)
      : [],
    // Fetch email templates
    resources.includes(TranscendPullResource.Templates)
      ? fetchAllTemplates(client)
      : [],
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

  // Save data flows
  if (dataFlows.length > 0) {
    result['data-flows'] = dataFlows.map(
      ({
        value,
        type,
        description,
        trackingType,
        service,
        status,
        owners,
        teams,
        attributeValues,
      }): DataFlowInput => ({
        value,
        type,
        description: description || undefined,
        trackingPurposes: trackingType,
        status,
        service: service?.integrationName,
        owners: owners.map(({ email }) => email),
        teams: teams.map(({ name }) => name),
        attributes:
          attributeValues !== undefined && attributeValues.length > 0
            ? formatAttributeValues(attributeValues)
            : undefined,
      }),
    );
  }

  // Save cookies
  if (cookies.length > 0) {
    result.cookies = cookies.map(
      ({
        name,
        isRegex,
        description,
        trackingPurposes,
        service,
        status,
        owners,
        teams,
        attributeValues,
      }): CookieInput => ({
        name,
        isRegex,
        description: description || undefined,
        trackingPurposes,
        status,
        service: service?.integrationName,
        owners: owners.map(({ email }) => email),
        teams: teams.map(({ name }) => name),
        attributes:
          attributeValues !== undefined && attributeValues.length > 0
            ? formatAttributeValues(attributeValues)
            : undefined,
      }),
    );
  }

  // Save attributes
  if (attributes.length > 0) {
    result.attributes = attributes.map(
      ({ description, name, type, values, ...rest }): AttributeInput => ({
        description: description || undefined,
        resources: Object.entries(rest)
          .filter(([key, value]) => value && key.startsWith('enabledOn'))
          .map(
            ([key]) => ENABLED_ON_TO_ATTRIBUTE_KEY[key],
          ) as AttributeResourceType[],
        name,
        type,
        values: values.map(({ name, color }) => ({ name, color })),
      }),
    );
  }

  // save email templates
  if (dataSiloIds.length === 0 && templates.length > 0) {
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
  if (dataSilos.length > 0) {
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
  }
  return result;
}
