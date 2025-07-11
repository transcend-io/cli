import { GraphQLClient } from 'graphql-request';
import { VENDORS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';

export interface Vendor {
  /** ID of vendor */
  id: string;
  /** Title of vendor */
  title: string;
  /** Description of vendor */
  description: string;
  /** DPA link */
  dataProcessingAgreementLink?: string;
  /** Contract email */
  contactName?: string;
  /** Contract phone */
  contactPhone?: string;
  /** Address */
  address?: string;
  /** Headquarters country */
  headquarterCountry?: IsoCountryCode;
  /** Headquarters subdivision */
  headquarterSubDivision?: IsoCountrySubdivisionCode;
  /** Website URL */
  websiteUrl?: string;
  /** Business entity */
  businessEntity?: {
    /** Business entity title */
    title: string;
  };
  /** Assigned teams */
  teams: {
    /** Team name */
    name: string;
  }[];
  /** Assigned owners */
  owners: {
    /** Email */
    email: string;
  }[];
  /** Custom fields */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key that the value represents */
    attributeKey: {
      /** Name of attribute team */
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all vendors in the organization
 *
 * @param client - GraphQL client
 * @returns All vendors in the organization
 */
export async function fetchAllVendors(
  client: GraphQLClient,
): Promise<Vendor[]> {
  const vendors: Vendor[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      vendors: { nodes },
    } = await makeGraphQLRequest<{
      /** Vendors */
      vendors: {
        /** List */
        nodes: Vendor[];
      };
    }>(client, VENDORS, {
      first: PAGE_SIZE,
      offset,
    });
    vendors.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return vendors.sort((a, b) => a.title.localeCompare(b.title));
}
