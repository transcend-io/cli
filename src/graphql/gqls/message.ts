import { gql } from 'graphql-request';

export const MESSAGES = gql`
  query TranscendCliFetchMessage {
    translatedMessages {
      id
      defaultMessage
      targetReactIntlId
      translations {
        locale
        value
      }
    }
  }
`;
