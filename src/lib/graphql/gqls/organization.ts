import { gql } from 'graphql-request';

export const ORGANIZATION = gql`
  query TranscendCliOrganization {
    organization {
      sombra {
        customerUrl
      }
    }
  }
`;
