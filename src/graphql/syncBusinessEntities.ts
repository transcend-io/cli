import { BusinessEntityInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import { UPDATE_BUSINESS_ENTITIES, CREATE_BUSINESS_ENTITY } from './gqls';
import { logger } from '../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  fetchAllBusinessEntities,
  BusinessEntity,
} from './fetchAllBusinessEntities';
import colors from 'colors';

/**
 * Input to create a new business entity
 *
 * @param client - GraphQL client
 * @param businessEntity - Input
 */
export async function createBusinessEntity(
  client: GraphQLClient,
  businessEntity: BusinessEntityInput,
): Promise<BusinessEntity> {
  const input = {
    title: businessEntity.title,
    description: businessEntity.description,
    address: businessEntity.address,
    headquarterCountry: businessEntity.headquarterCountry,
    headquarterSubDivision: businessEntity.headquarterSubDivision,
    dataProtectionOfficerName: businessEntity.dataProtectionOfficerName,
    dataProtectionOfficerEmail: businessEntity.dataProtectionOfficerEmail,
    // TODO: https://transcend.height.app/T-31994 - add attributes
  };

  const { createBusinessEntity } = await makeGraphQLRequest<{
    /** Create business entity mutation */
    createBusinessEntity: {
      /** Created business entity */
      businessEntity: BusinessEntity;
    };
  }>(client, CREATE_BUSINESS_ENTITY, {
    input,
  });
  return createBusinessEntity.businessEntity;
}

/**
 * Input to update business entities
 *
 * @param client - GraphQL client
 * @param businessEntityIdParis - [BusinessEntityInput, businessEntityId] list
 */
export async function updateBusinessEntities(
  client: GraphQLClient,
  businessEntityIdParis: [BusinessEntityInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_BUSINESS_ENTITIES, {
    input: businessEntityIdParis.map(([businessEntity, id]) => ({
      id,
      title: businessEntity.title,
      description: businessEntity.description,
      address: businessEntity.address,
      headquarterCountry: businessEntity.headquarterCountry,
      headquarterSubDivision: businessEntity.headquarterSubDivision,
      dataProtectionOfficerName: businessEntity.dataProtectionOfficerName,
      dataProtectionOfficerEmail: businessEntity.dataProtectionOfficerEmail,
      attributes: businessEntity.attributes,
    })),
  });
}

/**
 * Sync the data inventory business entities
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncBusinessEntities(
  client: GraphQLClient,
  inputs: BusinessEntityInput[],
): Promise<boolean> {
  // Fetch existing
  logger.info(
    colors.magenta(`Syncing "${inputs.length}" business entities...`),
  );

  let encounteredError = false;

  // Fetch existing
  const existingBusinessEntities = await fetchAllBusinessEntities(client);

  // Look up by title
  const businessEntityByTitle = keyBy(existingBusinessEntities, 'title');

  // Create new business entities
  const newBusinessEntities = inputs.filter(
    (input) => !businessEntityByTitle[input.title],
  );

  // Create new business entities
  await mapSeries(newBusinessEntities, async (businessEntity) => {
    try {
      const newBusinessEntity = await createBusinessEntity(
        client,
        businessEntity,
      );
      businessEntityByTitle[newBusinessEntity.title] = newBusinessEntity;
      logger.info(
        colors.green(
          `Successfully synced business entity "${businessEntity.title}"!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync business entity "${businessEntity.title}"! - ${err.message}`,
        ),
      );
    }
  });

  // Update all business entities
  try {
    logger.info(
      colors.magenta(`Updating "${inputs.length}" business entities!`),
    );
    await updateBusinessEntities(
      client,
      inputs.map((input) => [input, businessEntityByTitle[input.title].id]),
    );
    logger.info(
      colors.green(`Successfully synced "${inputs.length}" business entities!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(
        `Failed to sync "${inputs.length}" business entities ! - ${err.message}`,
      ),
    );
  }

  return !encounteredError;
}
