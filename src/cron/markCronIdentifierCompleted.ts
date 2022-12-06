import type { Got } from 'got';
import * as t from 'io-ts';

/**
 * Minimal set required to mark as completed
 */
export const CronIdentifierPush = t.type({
  nonce: t.string,
  identifier: t.string,
});

/** Type override */
export type CronIdentifierPush = t.TypeOf<typeof CronIdentifierPush>;

/**
 * Mark an identifier output by the cron job as completed.
 *
 * @see https://docs.transcend.io/docs/api-reference/PUT/v1/data-silo
 * @param sombra - Sombra instance configured to make requests
 * @param options - Additional options
 * @returns Successfully submitted request
 */
export async function markCronIdentifierCompleted(
  sombra: Got,
  { nonce, identifier }: CronIdentifierPush,
): Promise<void> {
  // Make the GraphQL request
  await sombra.put('v1/data-silo', {
    headers: {
      'x-transcend-nonce': nonce,
    },
    json: {
      profiles: [
        {
          profileId: identifier,
        },
      ],
    },
  });
}
