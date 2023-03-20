import { GraphQLClient } from 'graphql-request';
import { BUSINESS_ENTITIES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';

export interface BusinessEntity {
  /** ID of business entity */
  id: string;
  /** Title of business entity */
  title: string;
  /** Description of business entity */
  description?: string;
  /** Data protection officer name */
  dataProtectionOfficerName?: string;
  /** Data protection officer email */
  dataProtectionOfficerEmail?: string;
  /** Address of business entity */
  address?: string;
  /** Headquarters of business entity */
  headquarterCountry?: IsoCountryCode;
  /** Subdivision of business entity */
  headquarterSubDivision?: IsoCountrySubdivisionCode;
  /** Attributes */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key */
    attributeKey: {
      /** Name of attribute key */
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all businessEntities in the organization
 *
 * @param client - GraphQL client
 * @returns All businessEntities in the organization
 */
export async function fetchAllBusinessEntities(
  client: GraphQLClient,
): Promise<BusinessEntity[]> {
  const businessEntities: BusinessEntity[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      businessEntities: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest(client, BUSINESS_ENTITIES, {
      first: PAGE_SIZE,
      offset,
    });
    businessEntities.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return businessEntities;
}
