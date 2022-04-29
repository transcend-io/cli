import { gql } from 'graphql-request';

export const IDENTIFIERS = gql`
  query SchemaSyncIdentifiers($first: Int!, $offset: Int!) {
    identifiers(first: $first, offset: $offset) {
      nodes {
        id
        name
      }
    }
  }
`;

export const NEW_IDENTIFIER_TYPES = gql`
  query SchemaSyncNewIdentifierTypes {
    newIdentifierTypes {
      name
    }
  }
`;

export const CREATE_IDENTIFIER = gql`
  mutation SchemaSyncCreateIdentifier($name: String!, $type: IdentifierType!) {
    createIdentifier(input: { name: $name, type: $type }) {
      identifier {
        id
        name
      }
    }
  }
`;
