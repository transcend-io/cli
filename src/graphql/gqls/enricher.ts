import { gql } from 'graphql-request';

export const ENRICHERS = gql`
  query SchemaSyncEnrichers($title: String, $first: Int!, $offset: Int!) {
    enrichers(filterBy: { text: $title }, first: $first, offset: $offset) {
      nodes {
        id
        title
        url
        type
        inputIdentifier {
          name
        }
        identifiers {
          name
        }
        actions
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
    $headers: [CustomHeaderInput!]
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
        headers: $headers
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
    $headers: [CustomHeaderInput!]
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
        headers: $headers
        identifiers: $identifiers
        actions: $actions
      }
    ) {
      clientMutationId
    }
  }
`;
