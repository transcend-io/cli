import { GraphQLClient } from 'graphql-request';
import { MESSAGES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { LanguageKey } from '@transcend-io/internationalization';

export interface Message {
  /** ID of message */
  id: string;
  /** Default message */
  defaultMessage: string;
  /** React Intl ID */
  targetReactIntlId: string | null;
  /** Disabled locales */
  translations: {
    locale: LanguageKey;
    value: string;
  }[];
}

/**
 * Fetch all messages in the organization
 *
 * @param client - GraphQL client
 * @returns All messages in the organization
 */
export async function fetchAllMessages(
  client: GraphQLClient,
): Promise<Message[]> {
  const {
    translatedMessages,
    // eslint-disable-next-line no-await-in-loop
  } = await makeGraphQLRequest<{
    /** Messages */
    translatedMessages: Message[];
  }>(client, MESSAGES, {});
  return translatedMessages;
}
