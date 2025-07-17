import { LanguageKey } from '@transcend-io/internationalization';
import { GraphQLClient } from 'graphql-request';
import { MESSAGES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Message {
  /** ID of message */
  id: string;
  /** Default message */
  defaultMessage: string;
  /** React Intl ID */
  targetReactIntlId: string | null;
  /** Disabled locales */
  translations: {
    /** Locale */
    locale: LanguageKey;
    /** Value */
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
  const { translatedMessages } = await makeGraphQLRequest<{
    /** Messages */
    translatedMessages: Message[];
  }>(client, MESSAGES, {});
  return translatedMessages;
}
