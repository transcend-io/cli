import { BusinessEntityInput, ConsentManagerInput } from '../../codecs';
import { logger } from '../../logger';

/**
 * Combine multiple consent manager configurations into a list of business entity configurations
 *
 * @param inputs - Consent manager configurations to combine
 * @returns Business entity configuration input
 */
export function consentManagersToBusinessEntities(
  inputs: {
    /** Name of business entity */
    name: string;
    /** Consent manager input */
    input?: ConsentManagerInput;
  }[],
): BusinessEntityInput[] {
  // Construct the business entities YAML definition
  const businessEntities = inputs.map(
    ({ name, input }): BusinessEntityInput => ({
      // Title of Transcend Instance
      title: name.replace('.yml', ''),
      attributes: [
        // Sync domain list
        ...(input?.domains
          ? [
              {
                key: 'Transcend Domain List',
                values: [...new Set(input.domains)],
              },
            ]
          : []),
        // Sync bundle URLs
        ...(input?.bundleUrls
          ? [
              {
                key: 'Airgap Production URL',
                values: [input.bundleUrls.PRODUCTION],
              },
              {
                key: 'Airgap Test URL',
                values: [input.bundleUrls.TEST],
              },
              {
                key: 'Airgap XDI URL',
                values: [
                  input.bundleUrls.PRODUCTION.replace('airgap.js', 'xdi.js'),
                ],
              },
            ]
          : []),
        // Sync partition keys
        ...(input?.partition
          ? [
              {
                key: 'Consent Partition Key',
                values: [input.partition],
              },
            ]
          : []),
      ],
    }),
  );

  // Log out info on airgap scripts to host
  logger.info('\n\n~~~~~~~~~~~\nAirgap scripts to host:');
  businessEntities.forEach(({ attributes, title }, ind) => {
    attributes
      ?.find((attr) => attr.key === 'Airgap Production URL')
      ?.values?.forEach((url) => {
        logger.info(`${ind}) ${title} - ${url}`);
      });
  });

  return businessEntities;
}
