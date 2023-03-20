import { gql } from 'graphql-request';

export const DATA_SUBJECTS = gql`
  query TranscendCliDataSubjects {
    internalSubjects {
      id
      title {
        defaultMessage
      }
      type
      adminDashboardDefaultSilentMode
      actions {
        type
      }
    }
  }
`;

export const CREATE_DATA_SUBJECT = gql`
  mutation TranscendCliCreateDataSubject($type: String!) {
    createSubject(input: { type: $type, title: $type, subjectClass: OTHER }) {
      subject {
        id
        type
      }
    }
  }
`;
