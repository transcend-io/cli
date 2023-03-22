import { gql } from 'graphql-request';

export const ENRICHERS = gql`
  query TranscendCliEnrichers($title: String, $first: Int!, $offset: Int!) {
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

export interface Initializer {
  /** ID of enricher */
  id: string;
  /** Identifiers */
  identifiers: {
    /** Name of identifier */
    name: string;
  }[];
}

export const INITIALIZER = gql`
  query TranscendCliInitializer {
    initializer {
      id
      identifiers {
        name
      }
    }
  }
`;

export const CREATE_ENRICHER = gql`
  mutation TranscendCliCreateEnricher(
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
  mutation TranscendCliUpdateEnricher(
    $id: ID!
    $title: String!
    $description: String
    $url: String
    $inputIdentifier: ID
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
