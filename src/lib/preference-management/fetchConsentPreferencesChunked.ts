import { map as pmap } from 'bluebird';
import type { Got } from 'got';
import cliProgress from 'cli-progress';
import colors from 'colors';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

import { PreferencesQueryFilter, ChunkMode } from './types';
import {
  findEarliestDayWithData,
  findLatestDayWithData,
  getBoundsFromConsentFilter,
  pickConsentChunkMode,
} from './discoverConsentWindow';
import { buildConsentChunks } from './buildConsentChunks';
import { addDaysUtc, clampPageSize } from '../helpers';
import { iterateConsentPages } from './iterateConsentPages';
import { logger } from '../../logger';
import { sortConsentPreferences } from './sortConsentPreferences';

/**
 * Merge baseFilter with a window filter, taking care not to mix timestamp/updated fields improperly.
 *
 * @param mode - The chunking mode
 * @param base - The base filter
 * @param window - The per-chunk window filter
 * @returns merged filter
 */
function mergeFilter(
  mode: ChunkMode,
  base: PreferencesQueryFilter,
  window: PreferencesQueryFilter,
): PreferencesQueryFilter {
  if (mode === 'timestamp') {
    return {
      ...base,
      timestampAfter: window.timestampAfter ?? base.timestampAfter,
      timestampBefore: window.timestampBefore ?? base.timestampBefore,
      // ensure we don't pass `system.*` when chunking by timestamp
      system: undefined,
    };
  }
  // mode === 'updated'
  return {
    ...base,
    system: {
      ...(base.system || {}),
      ...(window.system?.updatedAfter
        ? { updatedAfter: window.system.updatedAfter }
        : {}),
      ...(window.system?.updatedBefore
        ? { updatedBefore: window.system.updatedBefore }
        : {}),
    },
    // Ensure we don't mix dimensions
    timestampAfter: undefined,
    timestampBefore: undefined,
  };
}

/**
 * High-level chunked fetch with progress bar.
 *
 * @param sombra - Got instance
 * @param options - Options
 * @returns preference items
 */
export async function fetchConsentPreferencesChunked(
  sombra: Got,
  {
    partition,
    filterBy = {},
    limit = 50,
    windowConcurrency = 25,
    maxChunks = 1000,
  }: {
    /** Partition */
    partition: string;
    /** Filter by preferences */
    filterBy?: PreferencesQueryFilter;
    /** Limit number of results */
    limit?: number;
    /** Window concurrency */
    windowConcurrency?: number;
    /** Max chunks */
    maxChunks?: number; // up to N chunks; min 1 hour per chunk
  },
): Promise<PreferenceQueryResponseItem[]> {
  const mode: ChunkMode = pickConsentChunkMode(filterBy);
  logger.info(
    colors.magenta(
      `Fetching consent preferences in chunks by ${
        mode === 'timestamp' ? 'timestamp' : 'system.updatedAt'
      }...`,
    ),
  );

  // Resolve / discover bounds (UTC)
  let { after, before } = getBoundsFromConsentFilter(mode, filterBy);
  logger.info(
    colors.magenta(
      `Initial bounds: after=${after?.toISOString() ?? 'undefined'} before=${
        before?.toISOString() ?? 'undefined'
      }`,
    ),
  );

  if (!after || !before) {
    if (!after) {
      logger.info(
        colors.magenta(
          `Discovering earliest day with data for partition ${partition}...`,
        ),
      );
      after = await findEarliestDayWithData(sombra, {
        partition,
        mode,
        baseFilter: filterBy,
        maxLookbackDays: 3650, // FIXME
      });
      logger.info(
        colors.green(
          `Discovered earliest day with data: ${after.toISOString()}`,
        ),
      );
    }
    if (!before) {
      logger.info(
        colors.magenta(
          `Discovering latest day with data for partition ${partition}...`,
        ),
      );
      const latestDay = await findLatestDayWithData(sombra, {
        partition,
        mode,
        baseFilter: filterBy,
        earliest: after,
      });
      // Exclusive upper bound = latest day start + 1 day (UTC)
      before = addDaysUtc(latestDay, 1);
      logger.info(
        colors.green(
          `Discovered latest day with data: ${latestDay.toISOString()}`,
        ),
      );
    }
  }

  logger.info(
    colors.green(
      `Final bounds (UTC): after=${after.toISOString()} before=${before.toISOString()}`,
    ),
  );

  // Build up to `maxChunks` chunks, min 1 hour each
  const chunks = buildConsentChunks(mode, after, before, maxChunks);

  logger.info(
    colors.magenta(
      `Fetching consent preferences from partition ${partition} in ${chunks.length} chunks...`,
    ),
  );

  // Progress bar over chunks (unordered):
  // - value = completed chunks (out-of-order OK)
  // - payload fetched = total records fetched
  const bar = new cliProgress.SingleBar(
    {
      format:
        'Downloading [{bar}] {percentage}% | chunks {value}/{total} | fetched {fetched}',
    },
    cliProgress.Presets.shades_classic,
  );

  let completed = 0; // finished chunks (out-of-order)
  let fetched = 0; // raw records counter

  bar.start(chunks.length, 0, { fetched });

  const t0 = Date.now();
  const pageSize = clampPageSize(limit);

  // If we are streaming, do not accumulate everything in memory.
  const out: PreferenceQueryResponseItem[] = [];

  await pmap(
    chunks.map((windowFilter, idx) => ({ windowFilter, idx })),
    async ({ windowFilter }) => {
      const filter = mergeFilter(mode, filterBy, windowFilter);

      // Gather this chunk’s pages locally, then emit immediately.
      const bucket: PreferenceQueryResponseItem[] = [];

      for await (const page of iterateConsentPages(
        sombra,
        partition,
        filter,
        pageSize,
      )) {
        bucket.push(...page);
        fetched += page.length;
        bar.update(completed, { fetched });
      }

      out.push(...bucket);

      completed += 1;
      bar.update(completed, { fetched });
    },
    { concurrency: Math.max(1, windowConcurrency) },
  );

  bar.update(completed, { fetched });
  bar.stop();

  logger.info(
    colors.green(
      `Fetched ${
        out.length
      } consent preference records from partition ${partition} in ${
        (Date.now() - t0) / 1000
      }s.`,
    ),
  );

  // Deterministic sort by the active dimension (descending: newest first), then by userId, then by first identifier
  const sorted = sortConsentPreferences(out, mode);

  logger.info(
    colors.green(
      `Sorted ${sorted.length} unique consent preference records from partition ${partition}.`,
    ),
  );

  return sorted;
}
