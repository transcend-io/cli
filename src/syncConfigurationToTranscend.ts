import { TranscendInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { fetchIdentifiersAndCreateMissing } from './fetchIdentifiers';
import { syncEnricher } from './syncEnrichers';
import { syncDataSilo } from './syncDataSilos';

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

  // Ensure all identifiers are created and create a map from name -> identifier.id
  const identifierByName = await fetchIdentifiersAndCreateMissing(
    input,
    client,
  );

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

  // Sync data silos
  if (dataSilos) {
    logger.info(colors.magenta(`Syncing "${dataSilos.length}" data silos...`));
    await mapSeries(dataSilos, async (dataSilo) => {
      logger.info(colors.magenta(`Syncing data silo "${dataSilo.title}"...`));
      try {
        await syncDataSilo(dataSilo, client);
        logger.info(
          colors.green(`Successfully synced data silo "${dataSilo.title}"!`),
        );
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

  return encounteredError;
}
