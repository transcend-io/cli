import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { difference } from 'lodash-es';
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

interface DeriveDataSilosFromDataFlowsCrossInstanceCommandFlags {
  auth: string;
  dataFlowsYmlFolder: string;
  output: string;
  ignoreYmls?: string[];
  transcendUrl: string;
}

export async function deriveDataSilosFromDataFlowsCrossInstance(
  this: LocalContext,
  {
    auth,
    dataFlowsYmlFolder,
    output,
    ignoreYmls = [],
    transcendUrl,
  }: DeriveDataSilosFromDataFlowsCrossInstanceCommandFlags,
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

  // Ignore the data flows in these yml files
  const instancesToIgnore = ignoreYmls.map((x) => x.split('.')[0]);

  // Map over each data flow yml file and convert to data silo configurations
  const dataSiloInputs = listFiles(dataFlowsYmlFolder).map((directory) => {
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

    return {
      adTechDataSilos,
      siteTechDataSilos,
      organizationName: directory.split('.')[0],
    };
  });

  // Mapping from service name to instances that have that service
  const serviceToInstance: Record<string, string[]> = {};
  for (const {
    adTechDataSilos,
    siteTechDataSilos,
    organizationName,
  } of dataSiloInputs) {
    const allDataSilos = [...adTechDataSilos, ...siteTechDataSilos];
    for (const dataSilo of allDataSilos) {
      const service = dataSilo['outer-type'] ?? dataSilo.integrationName;
      // create mapping to instance
      serviceToInstance[service] ??= [];
      serviceToInstance[service].push(organizationName);
      serviceToInstance[service] = [...new Set(serviceToInstance[service])];
    }
  }

  // List of ad tech integrations
  const adTechIntegrations = [
    ...new Set(
      dataSiloInputs.flatMap(({ adTechDataSilos }) =>
        adTechDataSilos.map(
          (silo) => silo['outer-type'] ?? silo.integrationName,
        ),
      ),
    ),
  ];

  // List of site tech integrations
  const siteTechIntegrations = difference(
    [
      ...new Set(
        dataSiloInputs.flatMap(({ siteTechDataSilos }) =>
          siteTechDataSilos.map(
            (silo) => silo['outer-type'] ?? silo.integrationName,
          ),
        ),
      ),
    ],
    adTechIntegrations,
  );

  // Mapping from service name to list of
  const serviceToFoundOnDomain: Record<string, string[]> = {};
  for (const { adTechDataSilos, siteTechDataSilos } of dataSiloInputs) {
    const allDataSilos = [...adTechDataSilos, ...siteTechDataSilos];
    for (const dataSilo of allDataSilos) {
      const service = dataSilo['outer-type'] ?? dataSilo.integrationName;
      const foundOnDomain = dataSilo.attributes?.find(
        (attribute) => attribute.key === 'Found On Domain',
      );
      // create mapping to instance
      serviceToFoundOnDomain[service] ??= [];
      serviceToFoundOnDomain[service].push(...(foundOnDomain?.values ?? []));
      serviceToFoundOnDomain[service] = [
        ...new Set(serviceToFoundOnDomain[service]),
      ];
    }
  }

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
            service in serviceToInstance ? serviceToInstance[service] : [],
            instancesToIgnore,
          ),
        },
        {
          key: 'Found On Domain',
          values:
            service in serviceToFoundOnDomain
              ? serviceToFoundOnDomain[service]
              : [],
        },
      ],
    }),
  );

  // Log output
  logger.log(`Total Services: ${dataSilos.length.toLocaleString()}`);
  logger.log(`Ad Tech Services: ${adTechIntegrations.length.toLocaleString()}`);
  logger.log(
    `Site Tech Services: ${siteTechIntegrations.length.toLocaleString()}`,
  );

  // Write to yaml
  writeTranscendYaml(output, {
    'data-silos': dataSilos,
  });
}
