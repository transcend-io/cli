import { union } from 'lodash-es';
import { DataFlowInput, DataSiloInput } from '../../codecs';
import { IndexedCatalogs } from '../graphql';

/**
 * Convert data flow configurations into a set of data silo configurations
 *
 * @param inputs - Data flow input to convert to data silos
 * @param options - Additional options
 * @returns Business entity configuration input
 */
export function dataFlowsToDataSilos(
  inputs: DataFlowInput[],
  {
    adTechPurposes = ['SaleOfInfo'],
    serviceToTitle,
    serviceToSupportedIntegration,
  }: IndexedCatalogs & {
    /** List of purposes that are considered "Ad Tech"  */
    adTechPurposes?: string[];
  },
): {
  /** List of data silo configurations for site-tech services */
  siteTechDataSilos: DataSiloInput[];
  /** List of data silo configurations for ad-tech services */
  adTechDataSilos: DataSiloInput[];
} {
  // List of site tech integrations
  let siteTechIntegrations: string[] = [];

  // List of ad tech integrations
  const adTechIntegrations: string[] = [];

  // Mapping from service name to list of
  const serviceToFoundOnDomain: Record<string, string[]> = {};

  // iterate over each flow
  for (const flow of inputs) {
    // process data flows with services
    const { service, attributes = [] } = flow;
    if (!service || service === 'internalService') {
      continue;
    }

    // create mapping to found on domain
    const foundOnDomain = attributes.find(
      (attribute) => attribute.key === 'Found on Domain',
    );

    // Create a list of all domains where the data flow was found
    if (foundOnDomain) {
      if (!serviceToFoundOnDomain[service]) {
        serviceToFoundOnDomain[service] = [];
      }
      serviceToFoundOnDomain[service].push(
        ...foundOnDomain.values.map((v) =>
          v.replace('https://', '').replace('http://', ''),
        ),
      );
      serviceToFoundOnDomain[service] = [
        ...new Set(serviceToFoundOnDomain[service]),
      ];
    }

    // Keep track of ad tech
    if (union(flow.trackingPurposes, adTechPurposes).length > 0) {
      // add service to ad tech list
      adTechIntegrations.push(service);

      // remove from site tech list
      if (siteTechIntegrations.includes(service)) {
        siteTechIntegrations = siteTechIntegrations.filter(
          (s) => s !== service,
        );
      }
    } else if (!adTechIntegrations.includes(service)) {
      // add to site tech list
      siteTechIntegrations.push(service);
    }
  }

  // create the list of ad tech integrations
  const adTechDataSilos = [...new Set(adTechIntegrations)].map((service) => ({
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
        key: 'Found On Domain',
        values: serviceToFoundOnDomain[service] || [],
      },
    ],
  }));

  // create the list of site tech integrations
  const siteTechDataSilos = [...new Set(siteTechIntegrations)].map(
    (service) => ({
      title: serviceToTitle[service],
      ...(serviceToSupportedIntegration[service]
        ? { integrationName: service }
        : { integrationName: 'promptAPerson', outerType: service }),
      attributes: [
        {
          key: 'Tech Type',
          values: ['Site Tech'],
        },
        {
          key: 'Found On Domain',
          values: serviceToFoundOnDomain[service] || [],
        },
      ],
    }),
  );

  return {
    siteTechDataSilos,
    adTechDataSilos,
  };
}
