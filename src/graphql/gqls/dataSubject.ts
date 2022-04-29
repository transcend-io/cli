import { gql } from 'graphql-request';

export const DATA_SUBJECTS = gql`
  query SchemaDataSubjects {
    internalSubjects {
      id
      type
    }
  }
`;

export const CREATE_DATA_SUBJECT = gql`
  mutation SchemaSyncCreateDataSubject($type: String!) {
    createSubject(input: { type: $type, title: $type, subjectClass: OTHER }) {
      subject {
        id
        type
      }
    }
  }
`;
