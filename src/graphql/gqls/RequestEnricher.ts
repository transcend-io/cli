import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
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
      useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: title, direction: ASC, model: enricher }
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

export const RETRY_REQUEST_ENRICHER = gql`
  mutation TranscendCliRetryRequestEnricher($requestEnricherId: ID!) {
    retryRequestEnricher(id: $requestEnricherId) {
      requestEnricher {
        id
      }
    }
  }
`;
