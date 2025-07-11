import { gql } from 'graphql-request';

export const VENDORS = gql`
  query TranscendCliVendors($first: Int!, $offset: Int!) {
    vendors(
      first: $first
      offset: $offset
      useMaster: false
      isExportCsv: true
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: title, direction: ASC }
      ]
    ) {
      nodes {
        id
        title
        description
        dataProcessingAgreementLink
        contactName
        contactEmail
        contactPhone
        address
        headquarterCountry
        headquarterSubDivision
        websiteUrl
        businessEntity {
          title
        }
        teams {
          name
        }
        owners {
          email
        }
        attributeValues {
          attributeKey {
            name
          }
          name
        }
      }
    }
  }
`;

export const CREATE_VENDOR = gql`
  mutation TranscendCliCreateVendor($input: CreateVendorInput!) {
    createVendor(input: $input) {
      vendor {
        id
        title
      }
    }
  }
`;

export const UPDATE_VENDORS = gql`
  mutation TranscendCliUpdateVendor($input: UpdateVendorsInput!) {
    updateVendors(input: $input) {
      clientMutationId
    }
  }
`;
