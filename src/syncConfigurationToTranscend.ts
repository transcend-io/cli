import { DataSiloInput, TranscendInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { fetchIdentifiersAndCreateMissing } from './fetchIdentifiers';
import { syncEnricher } from './syncEnrichers';

/**
 * Sync a data silo configuration
 *
 * @param dataSilo - The data silo input
 * @param client - GraphQL client
 */
export async function syncDataSilo(
  { objects, ...dataSilo }: DataSiloInput,
  client: GraphQLClient,
): Promise<void> {
  // TODO: https://transcend.height.app/T-10530 - check if data silo exists already
  // TODO: https://transcend.height.app/T-10530 - If exists then update
  // TODO: https://transcend.height.app/T-10530 - else create

  logger.info({ client });

  if (objects) {
    logger.info(
      colors.magenta(
        `Syncing "${objects.length}" objects for data silo ${dataSilo.title}...`,
      ),
    );
    await mapSeries(objects, (obj) => {
      logger.info({ obj });
      // TODO: https://transcend.height.app/T-10530 - check if obj exists already
      // TODO: https://transcend.height.app/T-10530 - If exists then update
      // TODO: https://transcend.height.app/T-10530 - else create
    });
  }
}

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

  // FIXME create new identifiers
  const identifiersById = await fetchIdentifiersAndCreateMissing(input, client);

  const { enrichers, 'data-silos': dataSilos } = input;

  // Sync enrichers
  if (enrichers) {
    logger.info(colors.magenta(`Syncing "${enrichers.length}" enrichers...`));
    await mapSeries(enrichers, async (enricher) => {
      logger.info(colors.magenta(`Syncing enricher "${enricher.title}"...`));
      try {
        await syncEnricher(enricher, client, identifiersById);
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
