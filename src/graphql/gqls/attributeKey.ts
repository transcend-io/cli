import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// TODO: https://transcend.height.app/T-27909 - order by createdAt
export const ATTRIBUTE_KEYS_REQUESTS = gql`
  query TranscendCliAttributeKeys($first: Int!, $offset: Int!) {
    attributeKeys(
      filterBy: { enabledOnRequests: true }
      first: $first
      useMaster: false
      offset: $offset
    ) {
      nodes {
        id
        name
        type
      }
    }
  }
`;
