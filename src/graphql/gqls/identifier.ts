import { gql } from 'graphql-request';

export const IDENTIFIERS = gql`
  query TranscendCliIdentifiers($first: Int!, $offset: Int!) {
    identifiers(first: $first, offset: $offset) {
      nodes {
        id
        name
      }
    }
  }
`;

export const NEW_IDENTIFIER_TYPES = gql`
  query TranscendCliNewIdentifierTypes {
    newIdentifierTypes {
      name
    }
  }
`;

export const CREATE_IDENTIFIER = gql`
  mutation TranscendCliCreateIdentifier(
    $name: String!
    $type: IdentifierType!
  ) {
    createIdentifier(input: { name: $name, type: $type }) {
      identifier {
        id
        name
      }
    }
  }
`;
