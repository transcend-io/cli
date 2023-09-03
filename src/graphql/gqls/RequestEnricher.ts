import { gql } from 'graphql-request';

export const REQUEST_ENRICHERS = gql`
  query TranscendCliRequestEnrichers(
    $first: Int!
    $offset: Int!
    $requestId: ID!
  ) {
    requestEnrichers(
      input: { requestId: $requestId }
      first: $first
      offset: $offset
      # TODO: https://transcend.height.app/T-27909 - enable optimizations
      # isExportCsv: true
      # useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        # TODO: https://transcend.height.app/T-28707 - include order
        # { field: title, direction: ASC, model: enricher }
      ]
    ) {
      nodes {
        id
        status
        enricher {
          id
          type
          title
        }
      }
      totalCount
    }
  }
`;
