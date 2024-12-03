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
        preferenceOptionValues {
          slug
        }
        purpose {
          trackingType
        }
      }
    }
  }
`;
