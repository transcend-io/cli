/* eslint-disable max-lines */
import {
  DataCategoryInput,
  DataSiloInput,
  ProcessingPurposeInput,
} from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from '../logger';
import colors from 'colors';
import { mapSeries, map } from 'bluebird';
import {
  DATA_SILOS,
  UPDATE_DATA_SILO,
  CREATE_DATA_SILO,
  UPDATE_OR_CREATE_DATA_POINT,
  DATA_SILO,
  DATA_POINTS,
  SUB_DATA_POINTS,
  UPDATE_PROMPT_A_VENDOR_SETTINGS,
} from './gqls';
import {
  convertToDataSubjectBlockList,
  DataSubject,
} from './fetchDataSubjects';
import { ApiKey } from './fetchApiKeys';
import {
  PromptAVendorEmailCompletionLinkType,
  PromptAVendorEmailSendType,
  RequestActionObjectResolver,
} from '@transcend-io/privacy-types';
import sortBy from 'lodash/sortBy';

export interface AttributeValue {
  /** Key associated to value */
  attributeKey: {
    /** Name of key */
    name: string;
  };
  /** Name of value */
  name: string;
}
export interface DataSilo {
  /** ID of dataSilo */
  id: string;
  /** Title of dataSilo */
  title: string;
  /** Type of silo */
  type: string;
  /** The link to the data silo */
  link: string;
  /** Attribute labels */
  attributeValues: AttributeValue[];
  /** description */
  description: string;
  /** Metadata for this data silo */
  catalog: {
    /** Whether the data silo supports automated vendor coordination */
    hasAvcFunctionality: boolean;
  };
}

/**
 * Fetch all dataSilos in the organization
 *
 * @param client - GraphQL client
 * @param title - Filter by title
 * @returns All dataSilos in the organization
 */
export async function fetchAllDataSilos(
  client: GraphQLClient,
  {
    title,
    pageSize,
    ids = [],
    integrationNames = [],
  }: {
    /** Page size to fetch datapoints in */
    pageSize: number;
    /** Title */
    title?: string;
    /** IDs */
    ids?: string[];
    /** Set of integration names to fetch */
    integrationNames?: string[];
  },
): Promise<DataSilo[]> {
  logger.info(
    colors.magenta(
      `Fetching ${ids.length === 0 ? 'all' : ids.length} Data Silos...`,
    ),
  );

  const dataSilos: DataSilo[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      dataSilos: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await client.request<{
      /** Query response */
      dataSilos: {
        /** List of matches */
        nodes: DataSilo[];
      };
    }>(DATA_SILOS, {
      first: pageSize,
      ids: ids.length > 0 ? ids : undefined,
      types: integrationNames.length > 0 ? integrationNames : undefined,
      offset,
      title,
    });
    dataSilos.push(...nodes);
    offset += pageSize;
    shouldContinue = nodes.length === pageSize;
  } while (shouldContinue);
  logger.info(
    colors.green(
      `Found a total of ${dataSilos.length} data silo${
        ids.length > 0 ? ` matching IDs ${ids.join(',')}` : ''
      }s${
        integrationNames.length > 0
          ? ` matching integrationNames ${integrationNames.join(',')}`
          : ''
      }`,
    ),
  );

  return dataSilos;
}

interface SubDataPoint {
  /** Name (or key) of the subdatapoint */
  name: string;
  /** The description */
  description?: string;
  /** Personal data category */
  categories: DataCategoryInput[];
  /** The processing purpose for this sub datapoint */
  purposes: ProcessingPurposeInput[];
  /**
   * When true, this subdatapoint should be revealed in a data access request.
   * When false, this field should be redacted
   */
  accessRequestVisibilityEnabled: boolean;
  /**
   * When true, this subdatapoint should be redacted during an erasure request.
   * There normally is a choice of enabling hard deletion or redaction at the
   * datapoint level, but if redaction is enabled, this column can be used
   * to define which fields should be redacted.
   */
  erasureRequestRedactionEnabled: boolean;
  /** Attribute attached to subdatapoint */
  attributeValues: AttributeValue[];
}

interface DataPoint {
  /** ID of dataPoint */
  id: string;
  /** Title of dataPoint */
  title: {
    /** Default message */
    defaultMessage: string;
  };
  /** The path to this data point */
  path: string[];
  /** Description */
  description: {
    /** Default message */
    defaultMessage: string;
  };
  /** Name */
  name: string;
  /** Global actions */
  actionSettings: {
    /** Action type */
    type: RequestActionObjectResolver;
    /** Is enabled */
    active: boolean;
  }[];
  /** Data collection tag for privacy request download zip labeling */
  dataCollection?: {
    /** Title of data collection */
    title: {
      /** Default message (since message can be translated) */
      defaultMessage: string;
    };
  };
  /** Metadata for this data silo */
  catalog: {
    /** Whether the data silo supports automated vendor coordination */
    hasAvcFunctionality: boolean;
  };
  /** Database integration queries */
  dbIntegrationQueries: {
    /** Approved query */
    query: string | null;
    /** Suggested query */
    suggestedQuery: string | null;
    /** Request action */
    requestType: RequestActionObjectResolver;
  }[];
}

interface DataPointWithSubDataPoint extends DataPoint {
  /** The associated subdatapoints */
  subDataPoints: SubDataPoint[];
}

/**
 * Helper to fetch all subdatapoints for a given datapoint
 *
 * @param client - The GraphQL client
 * @param dataPointId - The datapoint ID
 * @param options - Options
 * @returns The list of subdatapoints
 */
export async function fetchAllSubDataPoints(
  client: GraphQLClient,
  dataPointId: string,
  {
    debug,
    pageSize,
  }: {
    /** Debug logs */
    debug: boolean;
    /** Page size */
    pageSize: number;
  },
): Promise<SubDataPoint[]> {
  const subDataPoints: SubDataPoint[] = [];

  let offset = 0;

  let shouldContinue = false;
  do {
    try {
      if (debug) {
        logger.log(
          colors.magenta(`Pulling in subdatapoints for offset ${offset}`),
        );
      }

      const {
        subDataPoints: { nodes },
        // eslint-disable-next-line no-await-in-loop
      } = await client.request<{
        /** Query response */
        subDataPoints: {
          /** List of matches */
          nodes: SubDataPoint[];
        };
      }>(SUB_DATA_POINTS, {
        first: pageSize,
        dataPointIds: [dataPointId],
        offset,
      });
      subDataPoints.push(...nodes);
      offset += pageSize;
      shouldContinue = nodes.length === pageSize;

      if (debug) {
        logger.log(
          colors.green(
            `Pulled in subdatapoints for offset ${offset} for dataPointId=${dataPointId}`,
          ),
        );
      }
    } catch (err) {
      logger.error(
        colors.red(
          `An error fetching subdatapoints for offset ${offset} for dataPointId=${dataPointId}`,
        ),
      );
      throw err;
    }
  } while (shouldContinue);
  return sortBy(subDataPoints, 'name');
}

/**
 * Fetch all datapoints for a data silo
 *
 * @param client - GraphQL client
 * @param dataSiloId - Data silo ID
 * @param options - Options
 * @returns List of datapoints
 */
export async function fetchAllDataPoints(
  client: GraphQLClient,
  dataSiloId: string,
  {
    debug,
    pageSize,
  }: {
    /** Debug logs */
    debug: boolean;
    /** Page size */
    pageSize: number;
  },
): Promise<DataPointWithSubDataPoint[]> {
  const dataPoints: DataPointWithSubDataPoint[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    if (debug) {
      logger.info(colors.magenta(`Fetching datapoints with offset: ${offset}`));
    }

    const {
      dataPoints: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await client.request<{
      /** Query response */
      dataPoints: {
        /** List of matches */
        nodes: DataPoint[];
      };
    }>(DATA_POINTS, {
      first: pageSize,
      dataSiloIds: [dataSiloId],
      offset,
    });

    if (debug) {
      logger.info(
        colors.magenta(
          `Fetched ${nodes.length} datapoints at offset: ${offset}`,
        ),
      );
    }

    // eslint-disable-next-line no-await-in-loop
    await map(
      nodes,
      /* eslint-disable no-loop-func */
      async (node) => {
        try {
          if (debug) {
            logger.info(
              colors.magenta(
                `Fetching subdatapoints for ${node.name} for datapoint offset ${offset}`,
              ),
            );
          }

          const subDataPoints = await fetchAllSubDataPoints(client, node.id, {
            pageSize,
            debug,
          });
          dataPoints.push({
            ...node,
            subDataPoints,
          });

          if (debug) {
            logger.info(
              colors.green(
                `Successfully fetched subdatapoints for ${node.name}`,
              ),
            );
          }
        } catch (err) {
          logger.error(
            colors.red(
              `An error fetching subdatapoints for ${node.name} datapoint offset ${offset}`,
            ),
          );
          throw err;
        }
      },
      /* eslint-enable no-loop-func */
      {
        concurrency: 10,
      },
    );

    if (debug) {
      logger.info(
        colors.green(
          `Fetched all subdatapoints for page of datapoints at offset: ${offset}`,
        ),
      );
    }

    offset += pageSize;
    shouldContinue = nodes.length === pageSize;
  } while (shouldContinue);
  return sortBy(dataPoints, 'name');
}

export interface DataSiloEnriched {
  /** ID of dataSilo */
  id: string;
  /** Title of dataSilo */
  title: string;
  /** Type of silo */
  type: string;
  /** Description of data silo */
  description: string;
  /** Webhook URL */
  url?: string;
  /** Email address of user to notify for prompt a person use case */
  notifyEmailAddress?: string;
  /** Associated API keys */
  apiKeys: {
    /** Title */
    title: string;
  }[];
  /** Data subject block list */
  subjectBlocklist: {
    /** Type of data subject */
    type: string;
  }[];
  /** Identifiers */
  identifiers: {
    /** Name of identifier */
    name: string;
    /** True if identifier is wired */
    isConnected: boolean;
  }[];
  /** Dependent data silos */
  dependentDataSilos: {
    /** Title of silo */
    title: string;
  }[];
  /** Silo owners */
  owners: {
    /** Email owners */
    email: string;
  }[];
  /** The teams assigned to this data silo */
  teams: {
    /** Name of the team assigned to this data silo */
    name: string;
  }[];
  /** Metadata for this data silo */
  catalog: {
    /** Whether the data silo supports automated vendor coordination */
    hasAvcFunctionality: boolean;
  };
  /** Silo is live */
  isLive: boolean;
  /**
   * The frequency with which we should be sending emails for this data silo, in milliseconds.
   */
  promptAVendorEmailSendFrequency: number;
  /**
   * The type of emails to send for this data silo, i.e. send an email for each DSR, across all open DSRs,
   * or per profile in a DSR.
   */
  promptAVendorEmailSendType: PromptAVendorEmailSendType;
  /**
   * Indicates whether prompt-a-vendor emails should include a list of identifiers
   * in addition to a link to the bulk processing UI.
   */
  promptAVendorEmailIncludeIdentifiersAttachment: boolean;
  /**
   * Indicates what kind of link to generate as part of the emails sent out for this Prompt-a-Vendor silo.
   */
  promptAVendorEmailCompletionLinkType: PromptAVendorEmailCompletionLinkType;
  /**
   * The frequency with which we should retry sending emails for this data silo, in milliseconds.
   * Needs to be a string because the number can be larger than the MAX_INT
   */
  manualWorkRetryFrequency: string;
  /** Attribute values tagged to data silo */
  attributeValues: AttributeValue[];
}

/**
 * Fetch all dataSilos with additional metadata
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns All dataSilos in the organization
 */
export async function fetchEnrichedDataSilos(
  client: GraphQLClient,
  {
    ids,
    pageSize,
    title,
    debug,
    integrationNames,
  }: {
    /** Page size */
    pageSize: number;
    /** Filter by IDs */
    ids?: string[];
    /** Enable debug logs */
    debug: boolean;
    /** Filter by title */
    title?: string;
    /** Integration names */
    integrationNames?: string[];
  },
): Promise<[DataSiloEnriched, DataPointWithSubDataPoint[]][]> {
  const dataSilos: [DataSiloEnriched, DataPointWithSubDataPoint[]][] = [];

  const silos = await fetchAllDataSilos(client, {
    title,
    ids,
    integrationNames,
    pageSize,
  });
  await mapSeries(silos, async (silo, index) => {
    logger.info(
      colors.magenta(
        `[${index + 1}/${silos.length}] Fetching data silo - ${silo.title}`,
      ),
    );
    const { dataSilo } = await client.request<{
      /** Query response */
      dataSilo: DataSiloEnriched;
    }>(DATA_SILO, {
      id: silo.id,
    });

    if (debug) {
      logger.info(
        colors.magenta(
          `[${index + 1}/${
            silos.length
          }] Successfully fetched data silo metadata for - ${silo.title}`,
        ),
      );
    }

    const dataPoints = await fetchAllDataPoints(client, dataSilo.id, {
      debug,
      pageSize,
    });

    if (debug) {
      logger.info(
        colors.green(
          `[${index + 1}/${
            silos.length
          }] Successfully fetched datapoint for - ${silo.title}`,
        ),
      );
    }

    dataSilos.push([dataSilo, dataPoints]);
  });

  logger.info(
    colors.green(
      `Successfully fetched all ${silos.length} data silo configurations`,
    ),
  );

  return dataSilos;
}

/**
 * Sync a data silo configuration
 *
 * @param input - The transcend input definition
 * @param client - GraphQL client
 * @param options - Options
 * @returns Data silo info
 */
export async function syncDataSilo(
  {
    datapoints,
    'email-settings': promptAVendorEmailSettings,
    ...dataSilo
  }: DataSiloInput,
  client: GraphQLClient,
  {
    pageSize,
    dataSubjectsByName,
    apiKeysByTitle,
  }: {
    /** Page size */
    pageSize: number;
    /** The data subjects in the organization */
    dataSubjectsByName: { [type in string]: DataSubject };
    /** API key title to API key */
    apiKeysByTitle: { [title in string]: ApiKey };
  },
): Promise<DataSilo> {
  // Try to fetch an dataSilo with the same title
  const matches = await fetchAllDataSilos(client, {
    title: dataSilo.title,
    pageSize,
  });
  let existingDataSilo = matches.find(({ title }) => title === dataSilo.title);

  // If data silo exists, update it, else create new
  if (existingDataSilo) {
    await client.request(UPDATE_DATA_SILO, {
      id: existingDataSilo.id,
      title: dataSilo.title,
      url: dataSilo.url,
      headers: dataSilo.headers,
      description: dataSilo.description,
      identifiers: dataSilo['identity-keys'],
      isLive: !dataSilo.disabled,
      ownerEmails: dataSilo.owners,
      teamNames: dataSilo.teams,
      // clear out if not specified, otherwise the update needs to be applied after
      // all data silos are created
      dependedOnDataSiloTitles: dataSilo['deletion-dependencies']
        ? undefined
        : [],
      apiKeyId: dataSilo['api-key-title']
        ? apiKeysByTitle[dataSilo['api-key-title']].id
        : undefined,
      dataSubjectBlockListIds: dataSilo['data-subjects']
        ? convertToDataSubjectBlockList(
            dataSilo['data-subjects'],
            dataSubjectsByName,
          )
        : undefined,
      attributes: dataSilo.attributes,
    });
  } else {
    const { connectDataSilo } = await client.request<{
      /** Mutation result */
      connectDataSilo: {
        /** Created data silo */
        dataSilo: DataSilo;
      };
    }>(CREATE_DATA_SILO, {
      title: dataSilo.title,
      url: dataSilo.url,
      headers: dataSilo.headers,
      type: dataSilo.integrationName,
      description: dataSilo.description || '',
      identifiers: dataSilo['identity-keys'],
      isLive: !dataSilo.disabled,
      ownerEmails: dataSilo.owners,
      teamNames: dataSilo.teams,
      // clear out if not specified, otherwise the update needs to be applied after
      // all data silos are created
      dependedOnDataSiloTitles: dataSilo['deletion-dependencies']
        ? undefined
        : [],
      apiKeyId: dataSilo['api-key-title']
        ? apiKeysByTitle[dataSilo['api-key-title']].id
        : undefined,
      dataSubjectBlockListIds: dataSilo['data-subjects']
        ? convertToDataSubjectBlockList(
            dataSilo['data-subjects'],
            dataSubjectsByName,
          )
        : undefined,
    });
    existingDataSilo = connectDataSilo.dataSilo;
  }

  if (promptAVendorEmailSettings) {
    if (!existingDataSilo.catalog.hasAvcFunctionality) {
      logger.info(
        colors.red(
          `The data silo ${dataSilo.title} does not support setting email-settings. Please remove this field your yml file.`,
        ),
      );
      process.exit(1);
    } else {
      logger.info(
        colors.magenta(
          `Syncing email settings for data silo ${dataSilo.title}...`,
        ),
      );

      await client.request(UPDATE_PROMPT_A_VENDOR_SETTINGS, {
        dataSiloId: existingDataSilo!.id,
        notifyEmailAddress: promptAVendorEmailSettings['notify-email-address'],
        promptAVendorEmailSendFrequency:
          promptAVendorEmailSettings['send-frequency'],
        promptAVendorEmailSendType: promptAVendorEmailSettings['send-type'],
        promptAVendorEmailIncludeIdentifiersAttachment:
          promptAVendorEmailSettings['include-identifiers-attachment'],
        promptAVendorEmailCompletionLinkType:
          promptAVendorEmailSettings['completion-link-type'],
        promptAVendorEmailManualWorkRetryFrequency:
          promptAVendorEmailSettings['manual-work-retry-frequency'],
      });

      logger.info(
        colors.green(`Synced email-settings for data silo ${dataSilo.title}!`),
      );
    }
  }

  // Sync datapoints
  if (datapoints) {
    logger.info(
      colors.magenta(
        `Syncing "${datapoints.length}" datapoints for data silo ${dataSilo.title}...`,
      ),
    );
    await map(
      datapoints,
      async (datapoint) => {
        logger.info(colors.magenta(`Syncing datapoint "${datapoint.key}"...`));
        const fields = datapoint.fields
          ? datapoint.fields.map(
              ({ key, description, categories, purposes, ...rest }) =>
                // TODO: Support setting title separately from the 'key/name'
                ({
                  name: key,
                  description,
                  categories,
                  purposes,
                  accessRequestVisibilityEnabled:
                    rest['access-request-visibility-enabled'],
                  erasureRequestRedactionEnabled:
                    rest['erasure-request-redaction-enabled'],
                }),
            )
          : undefined;

        if (fields && fields.length > 0) {
          logger.info(
            colors.magenta(
              `Syncing ${fields.length} fields for datapoint "${datapoint.key}"...`,
            ),
          );
        }
        const payload = {
          dataSiloId: existingDataSilo!.id,
          path: datapoint.path,
          name: datapoint.key,
          title: datapoint.title,
          description: datapoint.description,
          ...(datapoint['data-collection-tag']
            ? { dataCollectionTag: datapoint['data-collection-tag'] }
            : {}),
          querySuggestions: !datapoint['privacy-action-queries']
            ? undefined
            : Object.entries(datapoint['privacy-action-queries']).map(
                ([key, value]) => ({
                  requestType: key,
                  suggestedQuery: value,
                }),
              ),
          enabledActions: datapoint['privacy-actions'] || [], // clear out when not specified
          subDataPoints: fields,
        };

        await client.request(UPDATE_OR_CREATE_DATA_POINT, payload);

        logger.info(colors.green(`Synced datapoint "${datapoint.key}"!`));
      },
      {
        concurrency: 5,
      },
    );
  }
  return existingDataSilo;
}
/* eslint-enable max-lines */
