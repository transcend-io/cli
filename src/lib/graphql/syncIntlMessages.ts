import { GraphQLClient } from 'graphql-request';
import { logger } from '../../logger';
import { IntlMessageInput } from '../../codecs';
import colors from 'colors';
import { UPDATE_INTL_MESSAGES } from './gqls';
import chunk from 'lodash/chunk';
import { mapSeries } from 'bluebird';
import { makeGraphQLRequest } from './makeGraphQLRequest';

const MAX_PAGE_SIZE = 100;

/**
 * Update or create intl messages
 *
 * @param client - GraphQL client
 * @param messageInputs - List of message inputs
 */
export async function updateIntlMessages(
  client: GraphQLClient,
  messageInputs: IntlMessageInput[],
): Promise<void> {
  // Batch update messages
  await mapSeries(chunk(messageInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_INTL_MESSAGES, {
      messages: page.map((message) => ({
        ...(message.id.includes('.') ? {} : { id: message.id }),
        defaultMessage: message.defaultMessage,
        targetReactIntlId: message.targetReactIntlId,
        translations: !message.translations
          ? undefined
          : Object.entries(message.translations).map(([locale, value]) => ({
              locale,
              value,
            })),
      })),
    });
  });
}

/**
 * Sync the set of messages from the YML interface into the product
 *
 * @param client - GraphQL client
 * @param messages - messages to sync
 * @returns True upon success, false upon failure
 */
export async function syncIntlMessages(
  client: GraphQLClient,
  messages: IntlMessageInput[],
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${messages.length}" messages...`));

  // Ensure no duplicates are being uploaded
  const notUnique = messages.filter(
    (message) => messages.filter((pol) => message.id === pol.id).length > 1,
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload messages as there were non-unique entries found: ${notUnique
        .map(({ id }) => id)
        .join(',')}`,
    );
  }

  try {
    logger.info(
      colors.magenta(`Upserting "${messages.length}" new messages...`),
    );
    await updateIntlMessages(client, messages);
    logger.info(
      colors.green(`Successfully synced ${messages.length} messages!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create messages! - ${err.message}`));
  }

  return !encounteredError;
}
