import colors from "colors";
import { GraphQLClient } from "graphql-request";
import { chunk } from "lodash-es";
import { IntlMessageInput } from "../../codecs";
import { logger } from "../../logger";
import { mapSeries } from "../bluebird-replace";
import { UPDATE_INTL_MESSAGES } from "./gqls";
import { makeGraphQLRequest } from "./makeGraphQLRequest";

const MAX_PAGE_SIZE = 100;

/**
 * Update or create intl messages
 *
 * @param client - GraphQL client
 * @param messageInputs - List of message inputs
 */
export async function updateIntlMessages(
  client: GraphQLClient,
  messageInputs: IntlMessageInput[]
): Promise<void> {
  // Batch update messages
  await mapSeries(chunk(messageInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_INTL_MESSAGES, {
      messages: page.map((message) => ({
        ...(message.id.includes(".") ? {} : { id: message.id }),
        defaultMessage: message.defaultMessage,
        targetReactIntlId: message.targetReactIntlId,
        translations: message.translations
          ? Object.entries(message.translations).map(([locale, value]) => ({
              locale,
              value,
            }))
          : undefined,
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
  messages: IntlMessageInput[]
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${messages.length}" messages...`));

  // Ensure no duplicates are being uploaded
  const notUnique = messages.filter(
    (message) => messages.filter((pol) => message.id === pol.id).length > 1
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload messages as there were non-unique entries found: ${notUnique
        .map(({ id }) => id)
        .join(",")}`
    );
  }

  try {
    logger.info(
      colors.magenta(`Upserting "${messages.length}" new messages...`)
    );
    await updateIntlMessages(client, messages);
    logger.info(
      colors.green(`Successfully synced ${messages.length} messages!`)
    );
  } catch (error) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create messages! - ${error.message}`));
  }

  return !encounteredError;
}
