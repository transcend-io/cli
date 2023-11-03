import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const LARGE_LANGUAGE_MODELS = gql`
  query TranscendCliLargeLanguageModels(
    $first: Int!
    $offset: Int!
    $filterBy: LargeLanguageModelFiltersInput
  ) {
    largeLanguageModels(
      first: $first
      orderBy: [
        { field: name, direction: ASC }
        { field: client, direction: ASC }
        { field: isTranscendHosted, direction: ASC }
      ]
      offset: $offset
      filterBy: $filterBy
    ) {
      nodes {
        id
        name
        client
        isTranscendHosted
      }
    }
  }
`;
