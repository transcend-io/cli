import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
//       orderBy: [
//         { field: createdAt, direction: ASC }
//         { field: title, direction: ASC }
//       ]
export const GLOBAL_ACTION_ITEMS = gql`
  query TranscendCliGlobalActionItems(
    $first: Int!
    $offset: Int!
    $filterBy: GlobalActionItemFiltersInput!
  ) {
    globalActionItems(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        ids
        count
        teams {
          id
          name
        }
        users {
          id
          email
        }
        dueDate
        priority
        titles
        resolved
        notes
        links
        type
        additionalContexts {
          iconOverride
          requestId
          dataSiloId
          requestType
          latestAirgapVersion
          parentTitle
        }
        attributeValues {
          name
          attributeKey {
            name
          }
        }
      }
    }
  }
`;

export const UPDATE_ACTION_ITEMS = gql`
  mutation TranscendCliUpdateActionItems(
    $input: UpdateActionItemsInput!
  ) {
    updateActionItems(input: $input!) {
      clientMutationId
    }
  }
`;

export const CREATE_ACTION_ITEMS = gql`
  mutation TranscendCliCreateActionItems(
    $input: [UpdateActionItemsInput!]!
  ) {
    createActionItems(input: $input!) {
      clientMutationId
    }
  }
`;
