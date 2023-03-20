import { gql } from 'graphql-request';

export const BUSINESS_ENTITIES = gql`
  query TranscendCliBusinessEntities {
    businessEntities {
      nodes {
        id
        title
        description
        dataProtectionOfficerName
        dataProtectionOfficerEmail
        address
        headquarterCountry
        headquarterSubDivision
        attributeValues {
          name
          attributeKey {
            name
          }
        }
      }
    }
  }
`;
