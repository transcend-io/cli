import type { ChunkMode, PreferencesQueryFilter } from './types';

/**
 * Decide which dimension to chunk on: 'timestamp' if timestamps provided, otherwise 'updated'
 *
 * @param filterBy - Filter to examine
 * @returns Chosen chunk mode
 */
export function pickConsentChunkMode(
  filterBy: PreferencesQueryFilter,
): ChunkMode {
  const hasTimestamp = !!filterBy.timestampAfter || !!filterBy.timestampBefore;
  return hasTimestamp ? 'timestamp' : 'updated';
}
