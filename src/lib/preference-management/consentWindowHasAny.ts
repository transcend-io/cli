import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import type { Got } from 'got';
import {
  ConsentPreferenceResponse,
  PreferencesQueryFilter,
  ChunkMode,
} from './types';
import { withPreferenceRetry } from './withPreferenceRetry';
import { logger } from '../../logger';

/**
 * Probe window: does it contain any records? Uses the given mode.
 *
 * @param sombra - Sombra
 * @param options - Options
 * @returns True if any records exist in the given window
 */
export async function consentWindowHasAny(
  sombra: Got,
  {
    partition,
    mode,
    baseFilter,
    afterISO,
    beforeISO,
  }: {
    /** Partition */
    partition: string;
    /** Chunking mode */
    mode: ChunkMode;
    /** Base filter */
    baseFilter: PreferencesQueryFilter;
    /** After ISO date */
    afterISO: string;
    /** Before ISO date */
    beforeISO: string;
  },
): Promise<boolean> {
  const filter: PreferencesQueryFilter =
    mode === 'timestamp'
      ? {
          ...baseFilter,
          timestampAfter: afterISO,
          timestampBefore: beforeISO,
          system: baseFilter.system,
        }
      : {
          ...baseFilter,
          timestampAfter: undefined,
          timestampBefore: undefined,
          system: {
            ...(baseFilter.system || {}),
            updatedAfter: afterISO,
            updatedBefore: beforeISO,
          },
        };
  const resp = await withPreferenceRetry(
    'Preference Query',
    () =>
      sombra
        .post(`v1/preferences/${partition}/query`, {
          json: { limit: 1, filter },
        })
        .json(),
    {
      onRetry: (attempt, error, message) => {
        logger.warn(
          colors.yellow(
            `Retry attempt ${attempt} for consentWindowHasAny due to error: ${message}`,
          ),
        );
      },
    },
  );

  const { nodes } = decodeCodec(ConsentPreferenceResponse, resp);
  return Array.isArray(nodes) && nodes.length > 0;
}
