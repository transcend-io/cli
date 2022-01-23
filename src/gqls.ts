import { gql } from 'graphql-request';

export const ENRICHERS = gql`
  query SchemaSyncEnrichers($title: String!) {
    enrichers(filterBy: { text: $title }) {
      nodes {
        id
        title
        inputIdentifier {
          name
        }
        identifiers {
          name
        }
      }
    }
  }
`;

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

export const CREATE_ENRICHER = gql`
  mutation SchemaSyncCreateEnricher(
    $title: String!
    $description: String!
    $url: String!
    $inputIdentifier: ID!
    $identifiers: [ID!]!
    $actions: [RequestAction!]!
  ) {
    createEnricher(
      input: {
        title: $title
        type: SERVER
        description: $description
        url: $url
        inputIdentifier: $inputIdentifier
        identifiers: $identifiers
        actions: $actions
      }
    ) {
      clientMutationId
    }
  }
`;

export const UPDATE_ENRICHER = gql`
  mutation SchemaSyncUpdateEnricher(
    $id: ID!
    $title: String!
    $description: String!
    $url: String!
    $inputIdentifier: ID!
    $identifiers: [ID!]!
    $actions: [RequestAction!]!
  ) {
    updateEnricher(
      input: {
        id: $id
        title: $title
        description: $description
        url: $url
        inputIdentifier: $inputIdentifier
        identifiers: $identifiers
        actions: $actions
      }
    ) {
      clientMutationId
    }
  }
`;
