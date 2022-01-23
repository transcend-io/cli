import { DataSiloInput, EnricherInput, TranscendInput } from './codecs';
import { GraphQLClient } from 'graphql-request';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { ENRICHERS } from './gqls';

/**
 * Sync an enricher configuration
 *
 * @param enricher - The enricher input
 * @param client - GraphQL client
 */
export async function syncEnricher(
  enricher: EnricherInput,
  client: GraphQLClient,
): Promise<void> {
  logger.info(colors.magenta(`Syncing enricher "${enricher.title}"...`));

  // Try to fetch an enricher with the same title
  const result = await client.request(ENRICHERS, {
    title: enricher.title,
  });

  logger.log({ result });

  // TODO: https://transcend.height.app/T-10530 - If exists then update
  // TODO: https://transcend.height.app/T-10530 - else create
  logger.info(
    colors.green(`Successfully synced enricher "${enricher.title}"!`),
  );
}

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
  logger.info(colors.magenta(`Syncing data silo "${dataSilo.title}"...`));
  // TODO: https://transcend.height.app/T-10530 - check if data silo exists already
  // TODO: https://transcend.height.app/T-10530 - If exists then update
  // TODO: https://transcend.height.app/T-10530 - else create

  logger.log({ client });

  if (objects) {
    logger.info(
      colors.magenta(
        `Syncing "${objects.length}" objects for data silo ${dataSilo.title}...`,
      ),
    );
    await mapSeries(objects, (obj) => {
      logger.log({ obj });

      // TODO: https://transcend.height.app/T-10530 - check if obj exists already
      // TODO: https://transcend.height.app/T-10530 - If exists then update
      // TODO: https://transcend.height.app/T-10530 - else create
    });
  }
  logger.info(
    colors.green(`Successfully synced data silo "${dataSilo.title}"!`),
  );
}

/**
 * Sync the yaml input back to Transcend using the GraphQL APIs
 *
 * @param input - The yml input
 * @param client - GraphQL client
 */
export async function syncConfigurationToTranscend(
  { enrichers, 'data-silos': dataSilos }: TranscendInput,
  client: GraphQLClient,
): Promise<void> {
  // Sync enrichers
  if (enrichers) {
    logger.info(colors.magenta(`Syncing "${enrichers.length}" enrichers...`));
    await mapSeries(enrichers, (enricher) => syncEnricher(enricher, client));
    logger.info(colors.green(`Synced "${enrichers.length}" enrichers!`));
  }

  // Sync data silos
  if (dataSilos) {
    logger.info(colors.magenta(`Syncing "${dataSilos.length}" data silos...`));
    await mapSeries(dataSilos, (dataSilo) => syncDataSilo(dataSilo, client));
    logger.info(colors.green(`Synced "${dataSilos.length}" data silos!`));
  }
}
