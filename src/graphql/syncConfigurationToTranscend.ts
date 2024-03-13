/* eslint-disable max-lines */
import { TranscendInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from '../logger';
import colors from 'colors';
import { map } from 'bluebird';
import {
  fetchIdentifiersAndCreateMissing,
  Identifier,
} from './fetchIdentifiers';
import { syncIdentifier } from './syncIdentifier';
import { syncEnricher } from './syncEnrichers';
import { syncAttribute } from './syncAttribute';
import { syncDataSiloDependencies, syncDataSilos } from './syncDataSilos';
import { syncCookies } from './syncCookies';
import { syncAssessments } from './syncAssessments';
import { syncAssessmentTemplates } from './syncAssessmentTemplates';
import {
  fetchAllDataSubjects,
  ensureAllDataSubjectsExist,
} from './fetchDataSubjects';
import { syncTeams } from './syncTeams';
import { syncDataSubject } from './syncDataSubject';
import { fetchApiKeys } from './fetchApiKeys';
import { syncPrompts } from './syncPrompts';
import { syncConsentManager } from './syncConsentManager';
import { fetchAllAttributes } from './fetchAllAttributes';
import { syncBusinessEntities } from './syncBusinessEntities';
import { syncDataFlows } from './syncDataFlows';
import { syncAction } from './syncAction';
import { syncTemplate } from './syncTemplates';
import { fetchAllActions } from './fetchAllActions';
import { syncPromptPartials } from './syncPromptPartials';
import { syncPromptGroups } from './syncPromptGroups';
import { syncAgents } from './syncAgents';
import { syncAgentFunctions } from './syncAgentFunctions';
import { syncAgentFiles } from './syncAgentFiles';
import { syncVendors } from './syncVendors';
import { syncDataCategories } from './syncDataCategories';
import { syncProcessingPurposes } from './syncProcessingPurposes';

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
    deleteExtraAttributeValues = false,
    creatorId,
  }: {
    /** Page size */
    pageSize?: number;
    /** Creator ID TODO: https://transcend.height.app/T-29850 - remove this  */
    creatorId?: string;
    /** When true, skip publishing to privacy center */
    publishToPrivacyCenter?: boolean;
    /** When true, delete any attributes being synced up */
    deleteExtraAttributeValues?: boolean;
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
    assessments,
    'assessment-templates': assessmentTemplates,
    'consent-manager': consentManager,
    'data-silos': dataSilos,
    'data-flows': dataFlows,
    prompts,
    'prompt-groups': promptGroups,
    'prompt-partials': promptPartials,
    agents,
    'agent-functions': agentFunctions,
    'agent-files': agentFiles,
    vendors,
    'data-categories': dataCategories,
    'processing-purposes': processingPurposes,
    teams,
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
      dataSilos || dataSubjects || enrichers
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

  // Sync prompts
  if (prompts) {
    const promptsSuccess = await syncPrompts(client, prompts);
    encounteredError = encounteredError || !promptsSuccess;
  }
  if (promptPartials) {
    const promptsSuccess = await syncPromptPartials(client, promptPartials);
    encounteredError = encounteredError || !promptsSuccess;
  }
  if (promptGroups) {
    const promptsSuccess = await syncPromptGroups(client, promptGroups);
    encounteredError = encounteredError || !promptsSuccess;
  }

  if (teams) {
    const teamsSuccess = await syncTeams(client, teams);
    encounteredError = encounteredError || !teamsSuccess;
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

  // Sync vendors
  if (vendors) {
    const vendorsSuccess = await syncVendors(client, vendors);
    encounteredError = encounteredError || !vendorsSuccess;
  }

  // Sync data categories
  if (dataCategories) {
    const dataCategoriesSuccess = await syncDataCategories(
      client,
      dataCategories,
    );
    encounteredError = encounteredError || !dataCategoriesSuccess;
  }

  // Sync processing purposes
  if (processingPurposes) {
    const processingPurposesSuccess = await syncProcessingPurposes(
      client,
      processingPurposes,
    );
    encounteredError = encounteredError || !processingPurposesSuccess;
  }

  // Sync agents
  if (agents) {
    const agentsSuccess = await syncAgents(client, agents);
    encounteredError = encounteredError || !agentsSuccess;
  }

  // Sync agent functions
  if (agentFunctions) {
    const agentFunctionsSuccess = await syncAgentFunctions(
      client,
      agentFunctions,
    );
    encounteredError = encounteredError || !agentFunctionsSuccess;
  }

  // Sync agent files
  if (agentFiles) {
    const agentFilesSuccess = await syncAgentFiles(client, agentFiles);
    encounteredError = encounteredError || !agentFilesSuccess;
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
          await syncEnricher(client, {
            enricher,
            identifierByName,
            dataSubjectsByName,
          });
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
          await syncAttribute(client, attribute, {
            existingAttribute: existing,
            deleteExtraAttributeValues,
          });
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
    const syncedDataFlows = await syncDataFlows(
      client,
      dataFlows,
      classifyService,
    );
    encounteredError = encounteredError || !syncedDataFlows;
  }

  // Sync assessments
  if (assessments) {
    const syncedAssessments = await syncAssessments(
      client,
      assessments,
      CONCURRENCY,
    );
    encounteredError = encounteredError || !syncedAssessments;
  }

  // Sync assessment templates
  if (assessmentTemplates) {
    const syncedAssessmentTemplates = await syncAssessmentTemplates(
      client,
      assessmentTemplates,
      { concurrency: CONCURRENCY, creatorId },
    );
    encounteredError = encounteredError || !syncedAssessmentTemplates;
  }

  // Store dependency updates
  const dependencyUpdates: [string, string[]][] = [];
  // Sync data silos
  if (dataSilos) {
    const { success, dataSiloTitleToId } = await syncDataSilos(
      dataSilos,
      client,
      {
        dataSubjectsByName,
        apiKeysByTitle: apiKeyTitleMap,
        pageSize,
      },
    );
    dataSilos?.forEach((dataSilo) => {
      // Queue up dependency update
      if (dataSilo['deletion-dependencies']) {
        dependencyUpdates.push([
          dataSiloTitleToId[dataSilo.title],
          dataSilo['deletion-dependencies'],
        ]);
      }
    });
    encounteredError = encounteredError || !success;
  }

  // Dependencies updated at the end after all data silos are created
  if (dependencyUpdates.length > 0) {
    await syncDataSiloDependencies(client, dependencyUpdates);
  }

  if (publishToPrivacyCenter) {
    // TODO: https://transcend.height.app/T-23779
  }

  return encounteredError;
}
/* eslint-enable max-lines */
