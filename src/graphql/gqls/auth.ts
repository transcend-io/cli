import { gql } from 'graphql-request';

export const DETERMINE_LOGIN_METHOD = gql`
  mutation TranscendCliDetermineLoginMethod($email: String!) {
    determineLoginMethod(input: { email: $email }) {
      loginMethod {
        email
        sombraPublicKey
      }
    }
  }
`;

export const LOGIN = gql`
  mutation TranscendCliLogin(
    $email: String!
    $password: String!
    $publicKey: String!
  ) {
    login(
      input: { email: $email, password: $password }
      publicKey: $publicKey
    ) {
      user {
        roles {
          id
          organization {
            name
            id
            uri
            parentOrganizationId
          }
        }
      }
    }
  }
`;

export const ASSUME_ROLE = gql`
  mutation TranscendCliAssumeRole($id: ID!, $publicKey: String!) {
    assumeRole(id: $id, publicKey: $publicKey) {
      clientMutationId
    }
  }
`;
