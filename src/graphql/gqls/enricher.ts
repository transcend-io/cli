import { gql } from 'graphql-request';

export const ENRICHERS = gql`
  query TranscendCliEnrichers($title: String, $first: Int!, $offset: Int!) {
    enrichers(
      filterBy: { text: $title }
      first: $first
      offset: $offset
      # TODO: https://transcend.height.app/T-27909 - enable optimizations
      # isExportCsv: true
      # useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: title, direction: ASC }
      ]
    ) {
      nodes {
        id
        title
        url
        type
        expirationDuration
        lookerQueryTitle
        testRegex
        transitionRequestStatus
        phoneNumbers
        regionList
        inputIdentifier {
          name
        }
        identifiers {
          name
        }
        dataSubjects {
          type
        }
        actions
      }
    }
  }
`;

export interface Initializer {
  /** ID of enricher */
  id: string;
  /** Identifiers */
  identifiers: {
    /** Name of identifier */
    name: string;
  }[];
}

export const INITIALIZER = gql`
  query TranscendCliInitializer {
    initializer {
      id
      identifiers {
        name
      }
    }
  }
`;

export const CREATE_ENRICHER = gql`
  mutation TranscendCliCreateEnricher($input: EnricherInput!) {
    createEnricher(input: $input) {
      clientMutationId
    }
  }
`;

export const UPDATE_ENRICHER = gql`
  mutation TranscendCliUpdateEnricher($input: UpdateEnricherInput!) {
    updateEnricher(input: $input) {
      clientMutationId
    }
  }
`;
