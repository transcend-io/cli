import { gql } from 'graphql-request';

export const TEMPLATES = gql`
  query SchemaSyncTemplates($title: String, $first: Int!, $offset: Int!) {
    enrichers(filterBy: { text: $title }, first: $first, offset: $offset) {
      nodes {
        id
        title
      }
    }
  }
`;

export const CREATE_TEMPLATE = gql`
  mutation SchemaSyncCreateTemplate($title: String!) {
    createTemplate(input: { title: $title }) {
      clientMutationId
    }
  }
`;

export const UPDATE_TEMPLATE = gql`
  mutation SchemaSyncUpdateTemplate($id: ID!, $title: String!) {
    updateEnricher(input: { id: $id, title: $title }) {
      clientMutationId
    }
  }
`;
