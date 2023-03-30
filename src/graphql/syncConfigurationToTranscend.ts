/* eslint-disable max-lines */
import { TranscendInput, DataFlowInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from '../logger';
import colors from 'colors';
import { mapSeries, map } from 'bluebird';
import {
  fetchIdentifiersAndCreateMissing,
  Identifier,
} from './fetchIdentifiers';
import { syncIdentifier } from './syncIdentifier';
import { syncEnricher } from './syncEnrichers';
import { syncAttribute } from './syncAttribute';
import { syncDataSilo, DataSilo } from './syncDataSilos';
import { syncCookies } from './syncCookies';
import {
  fetchAllDataSubjects,
  ensureAllDataSubjectsExist,
} from './fetchDataSubjects';
import { syncDataSubject } from './syncDataSubject';
import { fetchApiKeys } from './fetchApiKeys';
import { syncConsentManager } from './syncConsentManager';
import { fetchAllAttributes } from './fetchAllAttributes';
import { UPDATE_DATA_SILO } from './gqls';
import { syncBusinessEntities } from './syncBusinessEntities';
import { fetchAllDataFlows } from './fetchAllDataFlows';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { createDataFlows, updateDataFlows } from './syncDataFlows';
import { syncAction } from './syncAction';
import { syncTemplate } from './syncTemplates';
import { fetchAllActions } from './fetchAllActions';

const CONCURRENCY = 10;

/**
 * Sync the yaml input back to Transcend using the GraphQL APIs
 *
 * @param input - The yml input
 * @param client - GraphQL client
 * @param pageSize - Page size
 * @returns True if an error was encountered
 */
export async function syncConfigurationToTranscend(
  input: TranscendInput,
  client: GraphQLClient,
  {
    pageSize = 50,
    // TODO: https://transcend.height.app/T-23779
    publishToPrivacyCenter = true,
    classifyService = false,
  }: {
    /** Page size */
    pageSize?: number;
    /** When true, skip publishing to privacy center */
    publishToPrivacyCenter?: boolean;
    /** classify data flow service if missing */
    classifyService?: boolean;
  },
): Promise<boolean> {
  let encounteredError = false;

  logger.info(colors.magenta(`Fetching data with page size ${pageSize}...`));

  const {
    templates,
    attributes,
    actions,
    identifiers,
    'data-subjects': dataSubjects,
    'business-entities': businessEntities,
    enrichers,
    cookies,
    'consent-manager': consentManager,
    'data-silos': dataSilos,
    'data-flows': dataFlows,
  } = input;

  const [identifierByName, dataSubjectsByName, apiKeyTitleMap] =
    await Promise.all([
      // Ensure all identifiers are created and create a map from name -> identifier.id
      enrichers || identifiers
        ? fetchIdentifiersAndCreateMissing(
            input,
            client,
            !publishToPrivacyCenter,
          )
        : ({} as { [k in string]: Identifier }),
      // Grab all data subjects in the organization
      dataSilos || dataSubjects
        ? ensureAllDataSubjectsExist(input, client)
        : {},
      // Grab API keys
      dataSilos ? fetchApiKeys(input, client) : {},
    ]);

  // Sync consent manager
  if (consentManager) {
    logger.info(colors.magenta('Syncing consent manager...'));
    try {
      await syncConsentManager(client, consentManager);
      logger.info(colors.green('Successfully synced consent manager!'));
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to sync consent manager! - ${err.message}`),
      );
    }
  }

  // Sync email templates
  if (templates) {
    logger.info(
      colors.magenta(`Syncing "${templates.length}" email templates...`),
    );
    await map(
      templates,
      async (template) => {
        logger.info(colors.magenta(`Syncing template "${template.title}"...`));
        try {
          await syncTemplate(template, client);
          logger.info(
            colors.green(`Successfully synced template "${template.title}"!`),
          );
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to sync template "${template.title}"! - ${err.message}`,
            ),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${templates.length}" email templates!`));
  }

  // Sync business entities
  if (businessEntities) {
    const businessEntitySuccess = await syncBusinessEntities(
      client,
      businessEntities,
    );
    encounteredError = encounteredError || !businessEntitySuccess;
  }

  // Sync cookies
  if (cookies) {
    const cookiesSuccess = await syncCookies(client, cookies);
    encounteredError = encounteredError || !cookiesSuccess;
  }

  // Sync enrichers
  if (enrichers) {
    logger.info(colors.magenta(`Syncing "${enrichers.length}" enrichers...`));
    await map(
      enrichers,
      async (enricher) => {
        logger.info(colors.magenta(`Syncing enricher "${enricher.title}"...`));
        try {
          await syncEnricher(enricher, client, identifierByName);
          logger.info(
            colors.green(`Successfully synced enricher "${enricher.title}"!`),
          );
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to sync enricher "${enricher.title}"! - ${err.message}`,
            ),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${enrichers.length}" enrichers!`));
  }

  // Sync identifiers
  if (identifiers) {
    // Fetch existing
    logger.info(
      colors.magenta(`Syncing "${identifiers.length}" identifiers...`),
    );
    await map(
      identifiers,
      async (identifier) => {
        const existing = identifierByName[identifier.name];
        if (!existing) {
          throw new Error(
            `Failed to find identifier with name: ${identifier.type}. Should have been auto-created by cli.`,
          );
        }

        logger.info(
          colors.magenta(`Syncing identifier "${identifier.type}"...`),
        );
        try {
          await syncIdentifier(client, {
            identifier,
            dataSubjectsByName,
            identifierId: existing.id,
            skipPublish: !publishToPrivacyCenter,
          });
          logger.info(
            colors.green(
              `Successfully synced identifier "${identifier.type}"!`,
            ),
          );
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to sync identifier "${identifier.type}"! - ${err.message}`,
            ),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${identifiers.length}" identifiers!`));
  }

  // Sync actions
  if (actions) {
    // Fetch existing
    logger.info(colors.magenta(`Syncing "${actions.length}" actions...`));
    const existingActions = await fetchAllActions(client);
    await map(
      actions,
      async (action) => {
        const existing = existingActions.find(
          (act) => act.type === action.type,
        );
        if (!existing) {
          throw new Error(
            `Failed to find action with type: ${action.type}. Should have already existing in the organization.`,
          );
        }

        logger.info(colors.magenta(`Syncing action "${action.type}"...`));
        try {
          await syncAction(client, {
            action,
            actionId: existing.id,
            skipPublish: !publishToPrivacyCenter,
          });
          logger.info(
            colors.green(`Successfully synced action "${action.type}"!`),
          );
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to sync action "${action.type}"! - ${err.message}`,
            ),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${actions.length}" actions!`));
  }

  // Sync data subjects
  if (dataSubjects) {
    // Fetch existing
    logger.info(
      colors.magenta(`Syncing "${dataSubjects.length}" data subjects...`),
    );
    const existingDataSubjects = await fetchAllDataSubjects(client);
    await map(
      dataSubjects,
      async (dataSubject) => {
        const existing = existingDataSubjects.find(
          (subj) => subj.type === dataSubject.type,
        );
        if (!existing) {
          throw new Error(
            `Failed to find data subject with type: ${dataSubject.type}. Should have already existing in the organization.`,
          );
        }

        logger.info(
          colors.magenta(`Syncing data subject "${dataSubject.type}"...`),
        );
        try {
          await syncDataSubject(client, {
            dataSubject,
            dataSubjectId: existing.id,
            skipPublish: !publishToPrivacyCenter,
          });
          logger.info(
            colors.green(
              `Successfully synced data subject "${dataSubject.type}"!`,
            ),
          );
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to sync data subject "${dataSubject.type}"! - ${err.message}`,
            ),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${dataSubjects.length}" data subjects!`));
  }

  // Sync attributes
  if (attributes) {
    // Fetch existing
    logger.info(colors.magenta(`Syncing "${attributes.length}" attributes...`));
    const existingAttributes = await fetchAllAttributes(client);
    await map(
      attributes,
      async (attribute) => {
        const existing = existingAttributes.find(
          (attr) => attr.name === attribute.name,
        );

        logger.info(colors.magenta(`Syncing attribute "${attribute.name}"...`));
        try {
          await syncAttribute(client, attribute, existing);
          logger.info(
            colors.green(`Successfully synced attribute "${attribute.name}"!`),
          );
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to sync attribute "${attribute.name}"! - ${err.message}`,
            ),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${attributes.length}" attributes!`));
  }

  // Sync data flows
  if (dataFlows) {
    logger.info(colors.magenta(`Syncing "${dataFlows.length}" data flows...`));

    // Ensure no duplicates are being uploaded
    const notUnique = dataFlows.filter(
      (dataFlow) =>
        dataFlows.filter(
          (flow) =>
            dataFlow.value === flow.value && dataFlow.type === flow.type,
        ).length > 1,
    );
    if (notUnique.length > 0) {
      throw new Error(
        `Failed to upload data flows as there were non-unique entries found: ${notUnique
          .map(({ value }) => value)
          .join(',')}`,
      );
    }

    // Fetch existing
    const [existingLiveDataFlows, existingInReviewDataFlows] =
      await Promise.all([
        fetchAllDataFlows(client, ConsentTrackerStatus.Live),
        fetchAllDataFlows(client, ConsentTrackerStatus.NeedsReview),
      ]);
    const allDataFlows = [
      ...existingLiveDataFlows,
      ...existingInReviewDataFlows,
    ];

    // Determine which data flows are new vs existing
    const mapDataFlowsToExisting = dataFlows.map((dataFlow) => [
      dataFlow,
      allDataFlows.find(
        (flow) => dataFlow.value === flow.value && dataFlow.type === flow.type,
      )?.id,
    ]);

    // Create the new data flows
    const newDataFlows = mapDataFlowsToExisting
      .filter(([, existing]) => !existing)
      .map(([flow]) => flow as DataFlowInput);
    try {
      logger.info(
        colors.magenta(`Creating "${newDataFlows.length}" new data flows...`),
      );
      await createDataFlows(client, newDataFlows, classifyService);
      logger.info(
        colors.green(`Successfully synced ${newDataFlows.length} data flows!`),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(colors.red(`Failed to create data flows! - ${err.message}`));
    }

    // Update existing data flows
    const existingDataFlows = mapDataFlowsToExisting.filter(
      (x): x is [DataFlowInput, string] => !!x[1],
    );
    try {
      logger.info(
        colors.magenta(`Updating "${existingDataFlows.length}" data flows...`),
      );
      await updateDataFlows(client, existingDataFlows, classifyService);
      logger.info(
        colors.green(
          `Successfully updated "${existingDataFlows.length}" data flows!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(colors.red(`Failed to create data flows! - ${err.message}`));
    }

    logger.info(colors.green(`Synced "${dataFlows.length}" data flows!`));
  }

  // Store dependency updates
  const dependencyUpdates: [DataSilo, string[]][] = [];

  // Sync data silos
  if (dataSilos) {
    logger.info(colors.magenta(`Syncing "${dataSilos.length}" data silos...`));
    await mapSeries(dataSilos, async (dataSilo) => {
      logger.info(colors.magenta(`Syncing data silo "${dataSilo.title}"...`));
      try {
        const dataSiloInfo = await syncDataSilo(dataSilo, client, {
          dataSubjectsByName,
          apiKeysByTitle: apiKeyTitleMap,
          pageSize,
        });
        logger.info(
          colors.green(
            `Successfully synced data silo "${dataSilo.title}"! View at: ${dataSiloInfo.link}`,
          ),
        );

        // Queue up dependency update
        if (dataSilo['deletion-dependencies']) {
          dependencyUpdates.push([
            dataSiloInfo,
            dataSilo['deletion-dependencies'],
          ]);
        }
      } catch (err) {
        encounteredError = true;
        logger.info(
          colors.red(
            `Failed to sync data silo "${dataSilo.title}"! - ${err.message}`,
          ),
        );
      }
    });
    logger.info(colors.green(`Synced "${dataSilos.length}" data silos!`));
  }

  // Dependencies updated at the end after all data silos are created
  if (dependencyUpdates.length > 0) {
    logger.info(
      colors.magenta(
        `Syncing "${dependencyUpdates.length}" data silo dependencies...`,
      ),
    );
    await mapSeries(dependencyUpdates, async ([dataSilo, dependencyTitles]) => {
      logger.info(
        colors.magenta(
          `Syncing dependencies for data silo "${dataSilo.title}"...`,
        ),
      );
      try {
        await makeGraphQLRequest(client, UPDATE_DATA_SILO, {
          id: dataSilo.id,
          dependedOnDataSiloTitles: dependencyTitles,
        });
      } catch (err) {
        encounteredError = true;
        logger.info(
          colors.red(
            `Failed to sync dependencies for data silo "${dataSilo.title}"! - ${err.message}`,
          ),
        );
      }
    });
    logger.info(
      colors.green(`Synced "${dependencyUpdates.length}" data silos!`),
    );
  }

  if (publishToPrivacyCenter) {
    // TODO: https://transcend.height.app/T-23779
  }

  return encounteredError;
}
/* eslint-enable max-lines */
