import type { LocalContext } from '../../../context';
import {
  fetchAndIndexCatalogs,
  buildTranscendGraphQLClient,
} from '../../../lib/graphql';
import { join } from 'path';
import colors from 'colors';
import { logger } from '../../../logger';
import { dataFlowsToDataSilos } from '../../../lib/consent-manager/dataFlowsToDataSilos';
import { DataFlowInput } from '../../../codecs';
import { existsSync, lstatSync } from 'fs';
import { listFiles } from '../../../lib/api-keys';
import {
  readTranscendYaml,
  writeTranscendYaml,
} from '../../../lib/readTranscendYaml';

interface DeriveDataSilosFromDataFlowsCommandFlags {
  auth: string;
  dataFlowsYmlFolder: string;
  dataSilosYmlFolder: string;
  ignoreYmls?: string[];
  transcendUrl: string;
}

export async function deriveDataSilosFromDataFlows(
  this: LocalContext,
  {
    auth,
    dataFlowsYmlFolder,
    dataSilosYmlFolder,
    ignoreYmls = [],
    transcendUrl,
  }: DeriveDataSilosFromDataFlowsCommandFlags,
): Promise<void> {
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
      'data-silos': ignoreYmls.includes(directory) ? [] : dataSilos,
    });
  });
}
