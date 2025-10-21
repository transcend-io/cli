/* eslint-disable max-lines */
import colors from 'colors';
import type { Got } from 'got';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { ChunkMode, PreferencesQueryFilter } from './types';
import { startOfUtcDay, DAY_MS } from '../helpers';
import { iterateConsentPages } from './iterateConsentPages';
import { logger } from '../../logger';
import { pickConsentChunkMode } from './pickConsentChunkMode';
import { getComparisonTimeForRecord } from './getComparisonTimeForRecord';

/**
 * Get after/before bounds from filter for the given mode
 *
 * @param mode - Chunking mode
 * @param filterBy - Filter to examine
 * @returns after/before dates
 */
export function getBoundsFromConsentFilter(
  mode: ChunkMode,
  filterBy: PreferencesQueryFilter,
): {
  /** After date */
  after?: Date;
  /** Before date */
  before?: Date;
} {
  if (mode === 'timestamp') {
    return {
      after: filterBy.timestampAfter
        ? new Date(filterBy.timestampAfter)
        : undefined,
      before: filterBy.timestampBefore
        ? new Date(filterBy.timestampBefore)
        : undefined,
    };
  }
  const u = filterBy.system ?? {};
  return {
    after: u.updatedAfter ? new Date(u.updatedAfter) : undefined,
    before: u.updatedBefore ? new Date(u.updatedBefore) : undefined,
  };
}

/**
 * Merge base filter with a "before" bound (without mixing dimensions).
 *
 * @param mode - Chunking mode
 * @param base - Base filter to augment
 * @param beforeISO - ISO timestamp to apply as the exclusive *Before bound for the chosen dimension
 * @returns New filter with the appropriate *Before constraint applied
 */
function withBeforeBound(
  mode: ChunkMode,
  base: PreferencesQueryFilter,
  beforeISO?: string,
): PreferencesQueryFilter {
  if (mode === 'timestamp') {
    return {
      ...base,
      timestampBefore: beforeISO ?? base.timestampBefore,
    };
  }
  return {
    ...base,
    system: {
      ...(base.system || {}),
      ...(beforeISO ? { updatedBefore: beforeISO } : {}),
    },
    // ensure we don't mix dimensions
    timestampAfter: undefined,
    timestampBefore: undefined,
  };
}

/**
 * Fetch a single record (or null) with the given filter.
 *
 * @param sombra - Got instance configured for Sombra API
 * @param partition - Preference Store partition id
 * @param filter - Query filter to use (page size internally forced to 1)
 * @returns The first record or null if none
 */
async function fetchOne(
  sombra: Got,
  partition: string,
  filter: PreferencesQueryFilter,
): Promise<PreferenceQueryResponseItem | null> {
  logger.info(
    colors.magenta(
      `Single-record probe with filter: ${JSON.stringify(filter)}`,
    ),
  );
  const it = iterateConsentPages(sombra, partition, filter, /* pageSize */ 1);
  const res = await it.next();
  if (res.done || !res.value || res.value.length === 0) {
    logger.info(colors.yellow('Probe result: no record'));
    return null;
  }
  const item = res.value[0]!;
  logger.info(
    colors.green(
      `Probe result: found record at ${getComparisonTimeForRecord(
        pickConsentChunkMode(filter),
        item,
      ).toISOString()}`,
    ),
  );
  return item;
}

/**
 * Robust earliest-day search (UTC):
 * 1) Anchor at the newest record (single-record probe).
 * 2) Exponential “jump back” using seeds (1d, 7d, 30d) then doubling (60d, 120d, 240d, …)
 *    to cross into an empty region and establish a lower empty bound.
 * 3) **Exponential forward-from-empty**: gallop forward from the empty bound toward the last-found
 *    to land close to the frontier quickly.
 * 4) Tighten with a short binary search on time using single-record probes.
 *
 * (Implementation note: preserves the public signature and docs while improving efficiency.)
 *
 * @param sombra - Sombra
 * @param opts - Options
 * @returns Earliest day with data (UTC start-of-day)
 */
export async function findEarliestDayWithData(
  sombra: Got,
  opts: {
    /** Partition */
    partition: string;
    /** Chunking mode */
    mode: ChunkMode;
    /** Base filter */
    baseFilter: PreferencesQueryFilter;
    /** Optional safety cap in days to avoid unbounded lookback (default ~10 years) */
    maxLookbackDays?: number;
  },
): Promise<Date> {
  const { partition, mode, baseFilter, maxLookbackDays = 3650 } = opts;

  // 1) Find newest record (anchors our backtracking).
  const newest = await fetchOne(
    sombra,
    partition,
    withBeforeBound(mode, baseFilter),
  );
  if (!newest) {
    logger.info(
      colors.yellow('No records found; defaulting earliest day to today.'),
    );
    return startOfUtcDay(new Date());
  }
  const newestInstant = getComparisonTimeForRecord(mode, newest);
  logger.info(colors.green(`Newest instant: ${newestInstant.toISOString()}`));

  // 2) Exponential jump back to find an empty region.
  const seedSteps = [1, 7, 30]; // days
  let stepDaysIdx = 0;
  let stepMs = seedSteps[0] * DAY_MS;

  let lastFoundInstant = newestInstant; // last instant we *could* find a record before
  let emptyBeforeInstant: Date | null = null; // first bound that yielded no results

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const probeBound =
      stepDaysIdx < seedSteps.length
        ? new Date(newestInstant.getTime() - seedSteps[stepDaysIdx] * DAY_MS)
        : new Date(newestInstant.getTime() - stepMs);

    // stop if we exceeded lookback cap
    const daysSince =
      (startOfUtcDay(new Date()).getTime() -
        startOfUtcDay(probeBound).getTime()) /
      DAY_MS;
    if (daysSince > maxLookbackDays) {
      logger.warn(
        colors.yellow(
          `Exponential jump exceeded maxLookbackDays=${maxLookbackDays}. Using current bounds.`,
        ),
      );
      emptyBeforeInstant = probeBound;
      break;
    }

    logger.info(
      colors.magenta(
        `Probing before=${probeBound.toISOString()} (jump step ${
          stepDaysIdx < seedSteps.length
            ? `${seedSteps[stepDaysIdx]}d`
            : `${Math.round(stepMs / DAY_MS)}d`
        })…`,
      ),
    );

    const hit = await fetchOne(
      sombra,
      partition,
      withBeforeBound(mode, baseFilter, probeBound.toISOString()),
    );

    if (hit) {
      lastFoundInstant = getComparisonTimeForRecord(mode, hit);
      logger.info(
        colors.green(
          `Found older record at ${lastFoundInstant.toISOString()} — continue jumping back.`,
        ),
      );
      // advance step
      if (stepDaysIdx < seedSteps.length - 1) {
        stepDaysIdx += 1;
        stepMs = seedSteps[stepDaysIdx] * DAY_MS;
      } else if (stepDaysIdx === seedSteps.length - 1) {
        stepDaysIdx += 1; // switch to doubling mode
        stepMs = seedSteps[seedSteps.length - 1] * 2 * DAY_MS; // start at 60d
      } else {
        stepMs *= 2;
      }
      // eslint-disable-next-line no-continue
      continue;
    }

    // crossed into an empty zone — remember this bound
    emptyBeforeInstant = probeBound;
    logger.info(
      colors.green(
        `No record before ${probeBound.toISOString()} — established empty lower bound.`,
      ),
    );
    break;
  }

  // Guard: if for some reason empty bound wasn't set, synthesize one “just before” lastFound.
  if (!emptyBeforeInstant) {
    emptyBeforeInstant = new Date(lastFoundInstant.getTime() - DAY_MS);
  }

  // 3) Exponential forward-from-empty toward the found frontier.
  //    This “gallop” reduces the span dramatically before binary search.
  //    We keep moving the empty bound forward with exponentially growing steps
  //    until we get a hit; then we shrink onto that hit instant.
  let lo = emptyBeforeInstant; // known EMPTY (no data before this bound)
  let hi = lastFoundInstant; // known FOUND (there is data before this instant)
  let fwdStep = Math.max(
    DAY_MS,
    Math.floor((hi.getTime() - lo.getTime()) / 64),
  ); // start small-ish
  logger.info(
    colors.magenta(
      `Exponential forward-from-empty start: empty=${lo.toISOString()} found=${hi.toISOString()} step=${Math.round(
        fwdStep / DAY_MS,
      )}d`,
    ),
  );

  // Do a few gallop iterations (bounded so we don't loop forever if distribution is dense)
  for (let i = 0; i < 8; i += 1) {
    const probe = new Date(lo.getTime() + fwdStep);
    if (probe.getTime() >= hi.getTime()) break;

    logger.info(
      colors.magenta(`Forward gallop probe before=${probe.toISOString()}…`),
    );
    const hit = await fetchOne(
      sombra,
      partition,
      withBeforeBound(mode, baseFilter, probe.toISOString()),
    );

    if (hit) {
      // We crossed into data — tighten hi to the actual hit instant.
      hi = getComparisonTimeForRecord(mode, hit);
      logger.info(
        colors.green(
          `Gallop hit at ${hi.toISOString()} — tightening found bound. Next step halves.`,
        ),
      );
      fwdStep = Math.max(DAY_MS, Math.floor(fwdStep / 2));
    } else {
      // Still empty up to probe — advance lo and double the step.
      lo.setTime(probe.getTime());
      logger.info(
        colors.yellow(
          `Gallop miss — advancing empty bound to ${lo.toISOString()}. Next step doubles.`,
        ),
      );
      fwdStep = Math.min(hi.getTime() - lo.getTime(), fwdStep * 2);
      if (fwdStep < DAY_MS) fwdStep = DAY_MS;
    }

    if (hi.getTime() - lo.getTime() <= DAY_MS) break;
  }

  // 4) Finish with a short binary search between [lo (empty), hi (found)].
  while (hi.getTime() - lo.getTime() > DAY_MS) {
    const mid = new Date(
      lo.getTime() + Math.floor((hi.getTime() - lo.getTime()) / 2),
    );
    logger.info(colors.magenta(`Binary probe before=${mid.toISOString()}…`));

    const hit = await fetchOne(
      sombra,
      partition,
      withBeforeBound(mode, baseFilter, mid.toISOString()),
    );

    if (hit) {
      const when = getComparisonTimeForRecord(mode, hit);
      logger.info(
        colors.green(`Binary probe found record at ${when.toISOString()}.`),
      );
      hi = when; // there is data before mid -> earliest could be even earlier
    } else {
      logger.info(colors.yellow('Binary probe found no record.'));
      lo = mid; // still empty -> move low up
    }
  }

  const earliestDay = startOfUtcDay(hi);
  logger.info(
    colors.green(
      `Earliest day (UTC) resolved to ${earliestDay.toISOString()} (instant ≈ ${hi.toISOString()}).`,
    ),
  );
  return earliestDay;
}

/**
 * Find latest day with data using exponential growth forward from earliest (UTC day math).
 *
 * (Implementation note: per your request, we now fetch a single newest record to infer the latest day.)
 *
 * @param sombra - Sombra
 * @param opts - Options
 * @returns Latest day with data
 */
export async function findLatestDayWithData(
  sombra: Got,
  opts: {
    /** Partition */
    partition: string;
    /** Chunking mode */
    mode: ChunkMode;
    /** Base filter */
    baseFilter: PreferencesQueryFilter;
    /** Earliest date */
    earliest: Date; // inclusive day start
  },
): Promise<Date> {
  const { partition, mode, baseFilter } = opts;

  logger.info(colors.magenta('Latest-day discovery: probing newest record…'));
  const latest = await fetchOne(
    sombra,
    partition,
    withBeforeBound(mode, baseFilter),
  );
  if (!latest) {
    logger.info(
      colors.yellow('No records found at all; defaulting latest day to today.'),
    );
    return startOfUtcDay(new Date());
  }

  const when = getComparisonTimeForRecord(mode, latest);
  logger.info(colors.green(`Newest record instant is ${when.toISOString()}.`));

  const latestDay = startOfUtcDay(when);
  logger.info(
    colors.green(
      `Latest day (UTC) resolved to ${latestDay.toISOString()} from instant ${when.toISOString()}.`,
    ),
  );

  return latestDay;
}
/* eslint-enable max-lines */
