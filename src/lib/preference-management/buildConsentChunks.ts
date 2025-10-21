import { startOfHour, HOUR_MS, addMs } from '../helpers';
import type { ChunkMode, PreferencesQueryFilter } from './types';

/**
 * Build chunk windows by splitting [lower, upperExclusive) into up to `maxChunks`
 * equal-sized ranges, with a minimum chunk span of 1 hour. Boundaries are snapped
 * to the start of the hour for stability.
 *
 * @param mode - Chunking mode: 'timestamp' or 'system.updatedAt'
 * @param lower - Lower bound of the chunk (inclusive)
 * @param upperExclusive - Upper bound of the chunk (exclusive)
 * @param maxChunks - Maximum number of chunks to create
 * @returns Array of query filters representing each chunk
 */
export function buildConsentChunks(
  mode: ChunkMode,
  lower: Date,
  upperExclusive: Date,
  maxChunks = 1000,
): Array<PreferencesQueryFilter> {
  const totalMs = Math.max(0, upperExclusive.getTime() - lower.getTime());
  if (totalMs === 0) return [];

  // Snap the start to the top of the hour
  let cur = startOfHour(lower);

  // Compute chunk size: ceil(total / maxChunks), but never < 1 hour
  const rawChunkMs = Math.ceil(totalMs / Math.max(1, maxChunks));
  const chunkMs = Math.max(HOUR_MS, rawChunkMs);

  const chunks: PreferencesQueryFilter[] = [];

  while (cur < upperExclusive) {
    const next = new Date(
      Math.min(upperExclusive.getTime(), cur.getTime() + chunkMs),
    );

    if (mode === 'timestamp') {
      chunks.push({
        timestampAfter: cur.toISOString(),
        timestampBefore: next.toISOString(),
      });
    } else {
      chunks.push({
        system: {
          updatedAfter: cur.toISOString(),
          updatedBefore: next.toISOString(),
        },
      });
    }

    // Advance to next boundary. Also snap to hour to avoid drift.
    cur = startOfHour(addMs(cur, chunkMs));
  }

  return chunks;
}
