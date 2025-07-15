import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - order by createdAt
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const TEMPLATES = gql`
  query TranscendCliTemplates($title: String, $first: Int!, $offset: Int!) {
    templates(
      filterBy: { text: $title }
      first: $first
      offset: $offset
      useMaster: false
    ) {
      nodes {
        id
        title
        subject {
          defaultMessage
        }
        template {
          defaultMessage
        }
      }
    }
  }
`;

export const CREATE_TEMPLATE = gql`
  mutation TranscendCliCreateTemplate($title: String!) {
    createTemplate(input: { title: $title, template: "", subject: $title }) {
      clientMutationId
    }
  }
`;
