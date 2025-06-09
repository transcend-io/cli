import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
// orderBy: [
//   { field: createdAt, direction: ASC }
//   { field: name, direction: ASC }
// ]
export const PREFERENCE_TOPICS = gql`
  query TranscendCliPreferenceTopics(
    $first: Int!
    $offset: Int!
    $filterBy: PreferenceTopicFilterInput
  ) {
    preferenceTopics(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        id
        slug
        type
        title {
          id
          defaultMessage
        }
        showInPrivacyCenter
        displayDescription {
          id
          defaultMessage
        }
        defaultConfiguration
        preferenceOptionValues {
          slug
          title {
            id
            defaultMessage
          }
        }
        purpose {
          trackingType
        }
      }
    }
  }
`;

export const CREATE_OR_UPDATE_PREFERENCE_TOPIC = gql`
  mutation CreateOrUpdatePreferenceTopic(
    $input: CreateOrUpdatePreferenceTopicInput!
  ) {
    createOrUpdatePreferenceTopic(input: $input) {
      preferenceTopic {
        id
      }
    }
  }
`;

export const CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES = gql`
  mutation CreateOrUpdatePreferenceOptionValues(
    $input: CreateOrUpdatePreferenceOptionValuesInput!
  ) {
    createOrUpdatePreferenceOptionValues(input: $input) {
      preferenceOptionValues {
        id
        slug
      }
    }
  }
`;

export const PREFERENCE_OPTION_VALUES = gql`
  query PreferenceOptionValues {
    preferenceOptionValues {
      clientMutationId
      nodes {
        id
        title {
          id
          defaultMessage
        }
        slug
      }
    }
  }
`;
