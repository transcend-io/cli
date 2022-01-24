import { TranscendInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { fetchIdentifiersAndCreateMissing } from './fetchIdentifiers';
import { syncEnricher } from './syncEnrichers';
import { syncDataSilo, DataSilo } from './syncDataSilos';
import { fetchDataSubjects } from './fetchDataSubjects';
import { fetchApiKeys } from './fetchApiKeys';
import { UPDATE_DATA_SILO } from './gqls';

/**
 * Sync the yaml input back to Transcend using the GraphQL APIs
 *
 * @param input - The yml input
 * @param client - GraphQL client
 * @returns True if an error was encountered
 */
export async function syncConfigurationToTranscend(
  input: TranscendInput,
  client: GraphQLClient,
): Promise<boolean> {
  let encounteredError = false;

  const [identifierByName, dataSubjects, apiKeyTitleMap] = await Promise.all([
    // Ensure all identifiers are created and create a map from name -> identifier.id
    fetchIdentifiersAndCreateMissing(input, client),
    // Grab all data subjects in the organization
    fetchDataSubjects(input, client),
    // Grab API keys
    fetchApiKeys(input, client),
  ]);

  const { enrichers, 'data-silos': dataSilos } = input;

  // Sync enrichers
  if (enrichers) {
    logger.info(colors.magenta(`Syncing "${enrichers.length}" enrichers...`));
    await mapSeries(enrichers, async (enricher) => {
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
    });
    logger.info(colors.green(`Synced "${enrichers.length}" enrichers!`));
  }

  // Store dependency updates
  const dependencyUpdates: [DataSilo, string[]][] = [];

  // Sync data silos
  if (dataSilos) {
    logger.info(colors.magenta(`Syncing "${dataSilos.length}" data silos...`));
    await mapSeries(dataSilos, async (dataSilo) => {
      logger.info(colors.magenta(`Syncing data silo "${dataSilo.title}"...`));
      try {
        const dataSiloInfo = await syncDataSilo(
          dataSilo,
          client,
          dataSubjects,
          apiKeyTitleMap,
        );
        logger.info(
          colors.green(`Successfully synced data silo "${dataSilo.title}"!`),
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
        await client.request(UPDATE_DATA_SILO, {
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

  return encounteredError;
}
