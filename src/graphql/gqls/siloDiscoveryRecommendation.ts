import { gql } from 'graphql-request';

export const SILO_DISCOVERY_RECOMMENDATIONS = gql`
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
