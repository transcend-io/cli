import { gql } from 'graphql-request';

export const DATA_SUBJECTS = gql`
  query TranscendCliDataSubjects {
    internalSubjects {
      id
      title {
        defaultMessage
      }
      active
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

export const UPDATE_DATA_SUBJECT = gql`
  mutation TranscendCliUpdateDataSubject($input: UpdateSubjectInput!) {
    updateSubject(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_DATA_SUBJECT = gql`
  mutation TranscendCliToggleDataSubject($input: ToggleSubjectInput!) {
    toggleSubject(input: $input) {
      clientMutationId
    }
  }
`;
