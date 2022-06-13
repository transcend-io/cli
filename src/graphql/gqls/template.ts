import { gql } from 'graphql-request';

export const TEMPLATES = gql`
  query SchemaSyncTemplates($title: String, $first: Int!, $offset: Int!) {
    templates(filterBy: { text: $title }, first: $first, offset: $offset) {
      nodes {
        id
        title
      }
    }
  }
`;

export const CREATE_TEMPLATE = gql`
  mutation SchemaSyncCreateTemplate($title: String!) {
    createTemplate(input: { title: $title, template: "", subject: $title }) {
      clientMutationId
    }
  }
`;
