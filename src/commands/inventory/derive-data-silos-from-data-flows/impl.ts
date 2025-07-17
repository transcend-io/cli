import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import type { LocalContext } from '../../../context';
import { listFiles } from '../../../lib/api-keys';
import { dataFlowsToDataSilos } from '../../../lib/consent-manager/dataFlowsToDataSilos';
import {
  buildTranscendGraphQLClient,
  fetchAndIndexCatalogs,
} from '../../../lib/graphql';
import {
  readTranscendYaml,
  writeTranscendYaml,
} from '../../../lib/readTranscendYaml';
import { logger } from '../../../logger';

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
    throw new Error(
      'Missing required arg: --dataFlowsYmlFolder=./working/data-flows/',
    );
  }

  // Ensure folder is passed
  if (
    !existsSync(dataFlowsYmlFolder) ||
    !lstatSync(dataFlowsYmlFolder).isDirectory()
  ) {
    throw new Error(`Folder does not exist: "${dataFlowsYmlFolder}"`);
  }

  // Ensure folder is passed to dataSilosYmlFolder
  if (!dataSilosYmlFolder) {
    throw new Error(
      'Missing required arg: --dataSilosYmlFolder=./working/data-silos/',
    );
  }

  // Ensure folder is passed
  if (
    !existsSync(dataSilosYmlFolder) ||
    !lstatSync(dataSilosYmlFolder).isDirectory()
  ) {
    throw new Error(`Folder does not exist: "${dataSilosYmlFolder}"`);
  }

  // Fetch all integrations in the catalog
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { serviceToTitle, serviceToSupportedIntegration } =
    await fetchAndIndexCatalogs(client);

  // List of each data flow yml file
  for (const directory of listFiles(dataFlowsYmlFolder)) {
    // read in the data flows for a specific instance
    const { 'data-flows': dataFlows = [] } = readTranscendYaml(
      path.join(dataFlowsYmlFolder, directory),
    );

    // map the data flows to data silos
    const { adTechDataSilos, siteTechDataSilos } = dataFlowsToDataSilos(
      dataFlows,
      {
        serviceToSupportedIntegration,
        serviceToTitle,
      },
    );

    // combine and write to yml file
    const dataSilos = [...adTechDataSilos, ...siteTechDataSilos];
    logger.log(`Total Services: ${dataSilos.length.toLocaleString()}`);
    logger.log(`Ad Tech Services: ${adTechDataSilos.length.toLocaleString()}`);
    logger.log(
      `Site Tech Services: ${siteTechDataSilos.length.toLocaleString()}`,
    );
    writeTranscendYaml(path.join(dataSilosYmlFolder, directory), {
      'data-silos': ignoreYmls.includes(directory) ? [] : dataSilos,
    });
  }
}
