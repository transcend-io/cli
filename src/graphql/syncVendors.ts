import { VendorInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import { UPDATE_VENDORS, CREATE_VENDOR } from './gqls';
import { logger } from '../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import { fetchAllVendors, Vendor } from './fetchAllVendors';

/**
 * Input to create a new vendor
 *
 * @param client - GraphQL client
 * @param vendor - Input
 */
export async function createVendor(
  client: GraphQLClient,
  vendor: VendorInput,
): Promise<Pick<Vendor, 'id' | 'title'>> {
  const input = {
    title: vendor.title,
    description: vendor.description,
    address: vendor.address,
    headquarterCountry: vendor.headquarterCountry,
    headquarterSubDivision: vendor.headquarterSubDivision,
    dataProcessingAgreementLink: vendor.dataProcessingAgreementLink,
    contactName: vendor.contactName,
    contactPhone: vendor.contactPhone,
    websiteUrl: vendor.websiteUrl,
    // TODO: https://transcend.height.app/T-31994 - add attributes, teams, owners
  };

  const { createVendor } = await makeGraphQLRequest<{
    /** Create vendor mutation */
    createVendor: {
      /** Created vendor */
      vendor: Vendor;
    };
  }>(client, CREATE_VENDOR, {
    input,
  });
  return createVendor.vendor;
}

/**
 * Input to update vendors
 *
 * @param client - GraphQL client
 * @param vendorIdParis - [VendorInput, vendorId] list
 */
export async function updateVendors(
  client: GraphQLClient,
  vendorIdParis: [VendorInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_VENDORS, {
    input: {
      vendors: vendorIdParis.map(([vendor, id]) => ({
        id,
        title: vendor.title,
        description: vendor.description,
        address: vendor.address,
        headquarterCountry: vendor.headquarterCountry,
        headquarterSubDivision: vendor.headquarterSubDivision,
        dataProcessingAgreementLink: vendor.dataProcessingAgreementLink,
        contactName: vendor.contactName,
        contactPhone: vendor.contactPhone,
        websiteUrl: vendor.websiteUrl,
        // TODO: https://transcend.height.app/T-31994 - add teams, owners
        attributes: vendor.attributes,
      })),
    },
  });
}

/**
 * Sync the data inventory vendors
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncVendors(
  client: GraphQLClient,
  inputs: VendorInput[],
): Promise<boolean> {
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" vendors...`));

  let encounteredError = false;

  // Fetch existing
  const existingVendors = await fetchAllVendors(client);

  // Look up by title
  const vendorByTitle: { [k in string]: Pick<Vendor, 'id' | 'title'> } = keyBy(
    existingVendors,
    'title',
  );

  // Create new vendors
  const newVendors = inputs.filter((input) => !vendorByTitle[input.title]);

  // Create new vendors
  await mapSeries(newVendors, async (vendor) => {
    try {
      const newVendor = await createVendor(client, vendor);
      vendorByTitle[newVendor.title] = newVendor;
      logger.info(
        colors.green(`Successfully synced vendor "${vendor.title}"!`),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to sync vendor "${vendor.title}"! - ${err.message}`),
      );
    }
  });

  // Update all vendors
  try {
    logger.info(colors.magenta(`Updating "${inputs.length}" vendors!`));
    await updateVendors(
      client,
      inputs.map((input) => [input, vendorByTitle[input.title].id]),
    );
    logger.info(
      colors.green(`Successfully synced "${inputs.length}" vendors!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(
        `Failed to sync "${inputs.length}" vendors ! - ${err.message}`,
      ),
    );
  }

  return !encounteredError;
}
