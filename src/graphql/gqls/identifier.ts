import { gql } from 'graphql-request';

export const IDENTIFIERS = gql`
  query TranscendCliIdentifiers($first: Int!, $offset: Int!) {
    identifiers(first: $first, offset: $offset) {
      nodes {
        id
        name
        type
        regex
        selectOptions
        privacyCenterVisibility
        dataSubjects {
          type
        }
        isRequiredInForm
        placeholder
        displayTitle {
          defaultMessage
        }
        displayDescription {
          defaultMessage
        }
      }
    }
  }
`;

export const NEW_IDENTIFIER_TYPES = gql`
  query TranscendCliNewIdentifierTypes {
    newIdentifierTypes {
      name
    }
  }
`;

export const CREATE_IDENTIFIER = gql`
  mutation TranscendCliCreateIdentifier($input: IdentifierInput!) {
    createIdentifier(input: $input) {
      identifier {
        id
        name
      }
    }
  }
`;

export const UPDATE_IDENTIFIER = gql`
  mutation TranscendCliUpdateIdentifier($input: UpdateIdentifierInput!) {
    updateIdentifier(input: $input) {
      clientMutationId
    }
  }
`;
