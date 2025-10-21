import { startOfHour, HOUR_MS } from '../helpers';
import type { ChunkMode, PreferencesQueryFilter } from './types';

/**
 * Build chunk windows by splitting [lower, upperExclusive) into up to `maxChunks`
 * equal-sized ranges, with a minimum chunk span of 1 hour. Boundaries are snapped
 * once at the start to the top of the hour for stability.
 *
 * Each returned window is already "half-open" for an *inclusive* backend:
 * we subtract 1ms from the exclusive end so adjacent chunks do not overlap.
 *
 * Example (timestamp mode): [10:00, 12:00) → { after=10:00:00.000Z, before=11:59:59.999Z }
 *
 * @param mode - 'timestamp' or 'updated'
 * @param lower - Lower bound (inclusive)
 * @param upperExclusive - Upper bound (exclusive)
 * @param maxChunks - Maximum number of chunks to create
 * @returns Array of chunked preference query filters
 */
export function buildConsentChunks(
  mode: ChunkMode,
  lower: Date,
  upperExclusive: Date,
  maxChunks = 1000,
): Array<PreferencesQueryFilter> {
  const totalMs = Math.max(0, upperExclusive.getTime() - lower.getTime());
  if (totalMs === 0) return [];

  // Snap only the starting boundary to the hour. We avoid re-snapping every step
  // to prevent cumulative drift.
  const seriesStart = startOfHour(lower);

  // Compute base chunk size (ceil to ensure ≤ maxChunks), enforced ≥ 1h.
  const rawChunkMs = Math.ceil(totalMs / Math.max(1, maxChunks));
  const chunkMs = Math.max(HOUR_MS, rawChunkMs);

  // Number of chunks needed to cover [seriesStart, upperExclusive)
  const count = Math.ceil(
    (upperExclusive.getTime() - seriesStart.getTime()) / chunkMs,
  );

  const chunks: PreferencesQueryFilter[] = [];

  for (let i = 0; i < count; i += 1) {
    const startMs = seriesStart.getTime() + i * chunkMs;
    const endExclusiveMs = Math.min(
      upperExclusive.getTime(),
      startMs + chunkMs,
    );

    // Convert exclusive end to inclusive end for an inclusive backend: -1ms.
    const endInclusiveMs = endExclusiveMs - 1;

    // Guard: in degenerate cases (shouldn’t happen with the math above), clamp.
    const safeEndMs = Math.max(startMs, endInclusiveMs);

    const afterIso = new Date(startMs).toISOString();
    const beforeIso = new Date(safeEndMs).toISOString();

    if (mode === 'timestamp') {
      chunks.push({
        timestampAfter: afterIso,
        timestampBefore: beforeIso,
      });
    } else {
      chunks.push({
        system: {
          updatedAfter: afterIso,
          updatedBefore: beforeIso,
        },
      });
    }
  }

  return chunks;
}
