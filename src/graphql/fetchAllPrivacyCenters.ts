import { GraphQLClient } from 'graphql-request';
import { PRIVACY_CENTERS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';

export interface PrivacyCenter {
  /** ID of privacy center */
  id: string;
  /** Title of privacy center */
  title: string;
  /** Description of privacy center */
  description?: string;
  /** Data protection officer name */
  dataProtectionOfficerName?: string;
  /** Data protection officer email */
  dataProtectionOfficerEmail?: string;
  /** Address of privacy center */
  address?: string;
  /** Headquarters of privacy center */
  headquarterCountry?: IsoCountryCode;
  /** Subdivision of privacy center */
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
 * Fetch all privacy centers in the organization
 *
 * @param client - GraphQL client
 * @returns All privacy centers in the organization
 */
export async function fetchAllPrivacyCenters(
  client: GraphQLClient,
): Promise<PrivacyCenter[]> {
  const privacyCenters: PrivacyCenter[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      privacyCenters: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Privacy centers */
      privacyCenters: {
        /** List */
        nodes: PrivacyCenter[];
      };
    }>(client, PRIVACY_CENTERS, {
      first: PAGE_SIZE,
      offset,
    });
    privacyCenters.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return privacyCenters.sort((a, b) => a.title.localeCompare(b.title));
}
