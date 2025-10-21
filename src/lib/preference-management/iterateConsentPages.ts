import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import type { Got } from 'got';
import { ConsentPreferenceResponse, PreferencesQueryFilter } from './types';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { withPreferenceQueryRetry } from './withPreferenceQueryRetry';
import { logger } from '../../logger';

/**
 * Async generator over pages for a given filter
 *
 * @param sombra - Sombra Got instance
 * @param partition - Partition key
 * @param filter - Query filter
 * @param pageSize - Number of items per page
 * @yields Pages of PreferenceQueryResponseItem
 */
export async function* iterateConsentPages(
  sombra: Got,
  partition: string,
  filter: PreferencesQueryFilter,
  pageSize: number,
): AsyncGenerator<PreferenceQueryResponseItem[], void, void> {
  let cursor: string | undefined;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = { limit: pageSize };
    if (filter && Object.keys(filter).length) body.filter = filter;
    if (cursor) body.cursor = cursor;

    const resp = await withPreferenceQueryRetry(
      () =>
        sombra
          .post(`v1/preferences/${partition}/query`, {
            json: body,
          })
          .json(),
      {
        onRetry: (attempt, error, message) => {
          logger.warn(
            colors.yellow(
              `Retry attempt ${attempt} for fetchConsentPreferences due to error: ${message}`,
            ),
          );
        },
      },
    );

    const { nodes, cursor: nextCursor } = decodeCodec(
      ConsentPreferenceResponse,
      resp,
    );
    if (!nodes?.length) break;

    yield nodes;

    if (!nextCursor) break;
    cursor = nextCursor;
  }
}
