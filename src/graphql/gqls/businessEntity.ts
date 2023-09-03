import { gql } from 'graphql-request';

export const BUSINESS_ENTITIES = gql`
  query TranscendCliBusinessEntities($first: Int!, $offset: Int!) {
    businessEntities(
      first: $first
      offset: $offset
      orderBy: [
        # TODO: https://transcend.height.app/T-27909 - enable optimizations
        # { field: createdAt, direction: ASC }
        { field: title, direction: ASC }
      ]
      # TODO: https://transcend.height.app/T-27909 - enable optimizations
      # isExportCsv: true
      useMaster: false
    ) {
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

export const CREATE_BUSINESS_ENTITY = gql`
  mutation TranscendCliCreateBusinessEntity(
    $input: CreateBusinessEntityInput!
  ) {
    createBusinessEntity(input: $input) {
      businessEntity {
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

export const UPDATE_BUSINESS_ENTITIES = gql`
  mutation TranscendCliUpdateBusinessEntities(
    $input: [UpdateBusinessEntityInput!]!
  ) {
    updateBusinessEntities(input: { businessEntities: $input }) {
      clientMutationId
    }
  }
`;
