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

/**
 * Merge baseFilter with a window filter, taking care not to mix timestamp/updated fields improperly.
 *
 * @param mode
 * @param base
 * @param window
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
 * Convert a per-chunk window to half-open [after, before) by nudging `before` back 1ms.
 * This pairs cleanly with a backend that is inclusive when both bounds are supplied.
 *
 * If `before` is undefined (open-ended tail), we leave it as-is.
 * If `before - 1ms < after`, we clamp to `after` to avoid inverted windows.
 *
 * @param mode
 * @param window
 */
function toHalfOpen(
  mode: ChunkMode,
  window: PreferencesQueryFilter,
): PreferencesQueryFilter {
  const minus1 = (iso?: string) =>
    iso ? new Date(new Date(iso).getTime() - 1).toISOString() : undefined;

  if (mode === 'timestamp') {
    const a = window.timestampAfter;
    const b = window.timestampBefore;
    if (!b) return window;

    const bMinus = minus1(b);
    if (a && bMinus) {
      // clamp if necessary
      if (new Date(bMinus).getTime() < new Date(a).getTime()) {
        return { ...window, timestampBefore: a };
      }
      return { ...window, timestampBefore: bMinus };
    }
    return { ...window, timestampBefore: bMinus };
  }

  // mode === 'updated'
  const a = window.system?.updatedAfter;
  const b = window.system?.updatedBefore;
  if (!b) return window;

  const bMinus = minus1(b);
  if (a && bMinus) {
    if (new Date(bMinus).getTime() < new Date(a).getTime()) {
      return {
        ...window,
        system: { ...(window.system || {}), updatedBefore: a },
      };
    }
    return {
      ...window,
      system: { ...(window.system || {}), updatedBefore: bMinus },
    };
  }
  return {
    ...window,
    system: { ...(window.system || {}), updatedBefore: bMinus },
  };
}

/**
 * Get the comparison instant for sorting based on the chosen dimension.
 *
 * @param mode
 * @param item
 */
function getItemInstant(
  mode: ChunkMode,
  item: PreferenceQueryResponseItem,
): Date {
  if (mode === 'timestamp') {
    return new Date(item.timestamp);
  }
  // mode === 'updated'
  const d = item.system?.updatedAt ?? item.metadataTimestamp ?? item.timestamp;
  return new Date(d);
}

/**
 * High-level chunked fetch with progress bar.
 *
 * @param sombra
 * @param root0
 */
export async function fetchConsentPreferencesChunked(
  sombra: Got,
  {
    partition,
    filterBy = {},
    limit = 50,
    windowConcurrency = 10,
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

  // Progress bar over chunks; also shows running record count
  const bar = new cliProgress.SingleBar(
    {
      format:
        'Downloading [{bar}] {percentage}% | chunks {value}/{total} | records {records}',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );

  let records = 0;
  let completed = 0;
  bar.start(chunks.length, 0, { records });
  const t0 = Date.now();

  const pageSize = clampPageSize(limit);
  const all: PreferenceQueryResponseItem[] = [];

  try {
    await pmap(
      chunks,
      async (windowFilter) => {
        // Make each chunk half-open: [after, before) via before-1ms
        const halfOpen = toHalfOpen(mode, windowFilter);
        const filter = mergeFilter(mode, filterBy, halfOpen);

        for await (const page of iterateConsentPages(
          sombra,
          partition,
          filter,
          pageSize,
        )) {
          all.push(...page);
          records += page.length;
          bar.update(completed, { records });
        }

        completed += 1;
        bar.update(completed, { records });
      },
      { concurrency: Math.max(1, windowConcurrency) },
    );
  } finally {
    bar.stop();
  }

  // Deep de-dupe identical rows across chunk/page boundaries
  const beforeCount = all.length;
  const deduped = dedupeByDeepEquality(all);
  const removed = beforeCount - deduped.length;
  if (removed > 0) {
    logger.info(
      colors.yellow(`De-dupe removed ${removed} exact duplicate record(s)`),
    );
  }

  logger.info(
    colors.green(
      `Fetched ${
        deduped.length
      } unique consent preference records from partition ${partition} in ${
        (Date.now() - t0) / 1000
      }s.`,
    ),
  );

  // Deterministic sort by the active dimension (descending: newest first)
  deduped.sort((a, b) => {
    const ta = getItemInstant(mode, a).getTime();
    const tb = getItemInstant(mode, b).getTime();
    return tb - ta; // newest → oldest
  });

  return deduped;
}

// -------- Deep de-dupe helpers (entire row identical) --------
/**
 *
 * @param x
 */
function stableStringify(x: any): string {
  const seen = new WeakSet<object>();
  const norm = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(norm);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  };
  return JSON.stringify(norm(x));
}

/**
 *
 * @param items
 */
function dedupeByDeepEquality<T>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = stableStringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
