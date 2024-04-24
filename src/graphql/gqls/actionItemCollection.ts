import { gql } from 'graphql-request';
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
//       orderBy: [
//         { field: createdAt, direction: ASC }
//         { field: title, direction: ASC }
//       ]
export const GLOBAL_ACTION_ITEM_COLLECTIONS = gql`
  query TranscendCliGlobalActionItemCollectionss(
    $filterBy: GlobalActionItemCollectionFiltersInput!
  ) {
    globalActionItemCollections(filterBy: $filterBy) {
      nodes {
        id
        title
        description
        hidden
        visibleLocations
      }
    }
  }
`;
