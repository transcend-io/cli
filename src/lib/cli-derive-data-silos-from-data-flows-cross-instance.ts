#!/usr/bin/env node
import { fetchAndIndexCatalogs, buildTranscendGraphQLClient } from './graphql';
import { join } from 'path';
import yargs from 'yargs-parser';
import difference from 'lodash/difference';
import colors from 'colors';
import { logger } from '../logger';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { dataFlowsToDataSilos } from './consent-manager/dataFlowsToDataSilos';
import { DataFlowInput } from '../codecs';
import { existsSync, lstatSync } from 'fs';
import { listFiles } from './api-keys';
import { readTranscendYaml, writeTranscendYaml } from './readTranscendYaml';
import { splitCsvToList } from './requests';

/**
 * Derive the set of data silos from a set of data flows.
 *
 * Requires an API key - no scope required on API key
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-derive-data-silos-from-data-flows-cross-instance.ts --auth=$TRANSCEND_API_KEY \
 *   --dataFlowsYmlFolder=./working/data-flows/ \
 *   --output=./transcend.yml
 *
 * Standard usage:
 * yarn tr-derive-data-silos-from-data-flows-cross-instance --auth=$TRANSCEND_API_KEY \
 *   --dataFlowsYmlFolder=./working/data-flows/ \
 *   --output=./transcend.yml
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    dataFlowsYmlFolder,
    output = 'transcend.yml',
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

  // Ignore the data flows in these yml files
  const instancesToIgnore = splitCsvToList(ignoreYmls).map(
    (x) => x.split('.')[0],
  );

  // Map over each data flow yml file and convert to data silo configurations
  const dataSiloInputs = listFiles(dataFlowsYmlFolder).map((directory) => {
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

    return {
      adTechDataSilos,
      siteTechDataSilos,
      organizationName: directory.split('.')[0],
    };
  });

  // Mapping from service name to instances that have that service
  const serviceToInstance: { [k in string]: string[] } = {};
  dataSiloInputs.forEach(
    ({ adTechDataSilos, siteTechDataSilos, organizationName }) => {
      const allDataSilos = [...adTechDataSilos, ...siteTechDataSilos];
      allDataSilos.forEach((dataSilo) => {
        const service = dataSilo['outer-type'] || dataSilo.integrationName;
        // create mapping to instance
        if (!serviceToInstance[service]) {
          serviceToInstance[service] = [];
        }
        serviceToInstance[service]!.push(organizationName);
        serviceToInstance[service] = [...new Set(serviceToInstance[service])];
      });
    },
  );

  // List of ad tech integrations
  const adTechIntegrations = [
    ...new Set(
      dataSiloInputs
        .map(({ adTechDataSilos }) =>
          adTechDataSilos.map(
            (silo) => silo['outer-type'] || silo.integrationName,
          ),
        )
        .flat(),
    ),
  ];

  // List of site tech integrations
  const siteTechIntegrations = difference(
    [
      ...new Set(
        dataSiloInputs
          .map(({ siteTechDataSilos }) =>
            siteTechDataSilos.map(
              (silo) => silo['outer-type'] || silo.integrationName,
            ),
          )
          .flat(),
      ),
    ],
    adTechIntegrations,
  );

  // Mapping from service name to list of
  const serviceToFoundOnDomain: { [k in string]: string[] } = {};
  dataSiloInputs.forEach(({ adTechDataSilos, siteTechDataSilos }) => {
    const allDataSilos = [...adTechDataSilos, ...siteTechDataSilos];
    allDataSilos.forEach((dataSilo) => {
      const service = dataSilo['outer-type'] || dataSilo.integrationName;
      const foundOnDomain = dataSilo.attributes?.find(
        (attr) => attr.key === 'Found On Domain',
      );
      // create mapping to instance
      if (!serviceToFoundOnDomain[service]) {
        serviceToFoundOnDomain[service] = [];
      }
      serviceToFoundOnDomain[service]!.push(...(foundOnDomain?.values || []));
      serviceToFoundOnDomain[service] = [
        ...new Set(serviceToFoundOnDomain[service]),
      ];
    });
  });

  // Fetch all integrations in the catalog
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { serviceToTitle, serviceToSupportedIntegration } =
    await fetchAndIndexCatalogs(client);

  // construct the aggregated data silo inputs
  const dataSilos = [...adTechIntegrations, ...siteTechIntegrations].map(
    (service) => ({
      title: serviceToTitle[service],
      ...(serviceToSupportedIntegration[service]
        ? { integrationName: service }
        : { integrationName: 'promptAPerson', 'outer-type': service }),
      attributes: [
        {
          key: 'Tech Type',
          values: ['Ad Tech'],
        },
        {
          key: 'Business Units',
          values: difference(
            serviceToInstance[service] || [],
            instancesToIgnore,
          ),
        },
        {
          key: 'Found On Domain',
          values: serviceToFoundOnDomain[service] || [],
        },
      ],
    }),
  );

  // Log output
  logger.log(`Total Services: ${dataSilos.length}`);
  logger.log(`Ad Tech Services: ${adTechIntegrations.length}`);
  logger.log(`Site Tech Services: ${siteTechIntegrations.length}`);

  // Write to yaml
  writeTranscendYaml(output, {
    'data-silos': dataSilos,
  });
}

main();
