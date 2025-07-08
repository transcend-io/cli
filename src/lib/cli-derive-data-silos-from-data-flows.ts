#!/usr/bin/env node
import { fetchAndIndexCatalogs, buildTranscendGraphQLClient } from './graphql';
import { join } from 'path';
import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { dataFlowsToDataSilos } from './consent-manager/dataFlowsToDataSilos';
import { DataFlowInput } from '../codecs';
import { splitCsvToList } from './requests';
import { existsSync, lstatSync } from 'fs';
import { listFiles } from './api-keys';
import { readTranscendYaml, writeTranscendYaml } from './readTranscendYaml';

/**
 * Derive the set of data silos that can be derived from a set of data flows.
 *
 * Requires an API key - no scope required on API key
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-derive-data-silos-from-data-flows.ts --auth=$TRANSCEND_API_KEY \
 *   --dataFlowsYmlFolder=./working/data-flows/ \
 *   --dataSilosYmlFolder=./working/data-silos/
 *
 * Standard usage:
 * yarn tr-derive-data-silos-from-data-flows --auth=$TRANSCEND_API_KEY \
 *   --dataFlowsYmlFolder=./working/data-flows/ \
 *   --dataSilosYmlFolder=./working/data-silos/
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    dataFlowsYmlFolder,
    dataSilosYmlFolder,
    ignoreYmls = '',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Ensure folder is passed to dataFlowsYmlFolder
  if (!dataFlowsYmlFolder) {
    logger.error(
      colors.red(
        'Missing required arg: --dataFlowsYmlFolder=./working/data-flows/',
      ),
    );
    process.exit(1);
  }

  // Ensure folder is passed
  if (
    !existsSync(dataFlowsYmlFolder) ||
    !lstatSync(dataFlowsYmlFolder).isDirectory()
  ) {
    logger.error(colors.red(`Folder does not exist: "${dataFlowsYmlFolder}"`));
    process.exit(1);
  }

  // Ensure folder is passed to dataSilosYmlFolder
  if (!dataSilosYmlFolder) {
    logger.error(
      colors.red(
        'Missing required arg: --dataSilosYmlFolder=./working/data-silos/',
      ),
    );
    process.exit(1);
  }

  // Ensure folder is passed
  if (
    !existsSync(dataSilosYmlFolder) ||
    !lstatSync(dataSilosYmlFolder).isDirectory()
  ) {
    logger.error(colors.red(`Folder does not exist: "${dataSilosYmlFolder}"`));
    process.exit(1);
  }

  // Ignore the data flows in these yml files
  const ymlsToIgnore = splitCsvToList(ignoreYmls);

  // Fetch all integrations in the catalog
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { serviceToTitle, serviceToSupportedIntegration } =
    await fetchAndIndexCatalogs(client);

  // List of each data flow yml file
  listFiles(dataFlowsYmlFolder).forEach((directory) => {
    // read in the data flows for a specific instance
    const { 'data-flows': dataFlows = [] } = readTranscendYaml(
      join(dataFlowsYmlFolder, directory),
    );

    // map the data flows to data silos
    const { adTechDataSilos, siteTechDataSilos } = dataFlowsToDataSilos(
      dataFlows as DataFlowInput[],
      {
        serviceToSupportedIntegration,
        serviceToTitle,
      },
    );

    // combine and write to yml file
    const dataSilos = [...adTechDataSilos, ...siteTechDataSilos];
    logger.log(`Total Services: ${dataSilos.length}`);
    logger.log(`Ad Tech Services: ${adTechDataSilos.length}`);
    logger.log(`Site Tech Services: ${siteTechDataSilos.length}`);
    writeTranscendYaml(join(dataSilosYmlFolder, directory), {
      'data-silos': ymlsToIgnore.includes(directory) ? [] : dataSilos,
    });
  });
}

main();
