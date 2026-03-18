import { gql } from 'graphql-request';

export const MESSAGES = gql`
  query TranscendCliFetchMessage {
    translatedMessages {
      id
      defaultMessage
      description
      targetReactIntlId
      translations {
        locale
        value
      }
    }
  }
`;

export const UPDATE_INTL_MESSAGES = gql`
  mutation TranscendCliUpdateIntlMessages($messages: [MessageInput!]!) {
    updateIntlMessages(input: { messages: $messages, skipPublish: true }) {
      clientMutationId
    }
  }
`;
