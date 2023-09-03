import { gql } from 'graphql-request';

export const API_KEYS = gql`
  query TranscendCliApiKeys($first: Int!, $offset: Int!, $titles: [String!]) {
    apiKeys(
      first: $first
      offset: $offset
      filterBy: { titles: $titles }
      # Order by createdAt to ensure pagination consistent as new silos are created
      orderBy: [{ field: createdAt, direction: ASC }]
    ) {
      nodes {
        id
        title
      }
    }
  }
`;

export const CREATE_API_KEY = gql`
  mutation TranscendCliCreateApiKey($input: ApiKeyInput!) {
    createApiKey(input: $input) {
      apiKey {
        id
        apiKey
        title
      }
    }
  }
`;

export const DELETE_API_KEY = gql`
  mutation TranscendCliDeleteApiKey($id: ID!) {
    deleteApiKey(id: $id) {
      clientMutationId
    }
  }
`;
