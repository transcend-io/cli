import { GraphQLClient } from 'graphql-request';
import { MESSAGES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import type { LocaleValue } from '@transcend-io/internationalization';

export interface Message {
  /** ID of message */
  id: string;
  /** Default message */
  defaultMessage: string;
  /** Description */
  description: string;
  /** React Intl ID */
  targetReactIntlId: string | null;
  /** Disabled locales */
  translations: {
    /** Locale */
    locale: LocaleValue;
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
