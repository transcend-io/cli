import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { ChunkMode } from './types';

/**
 * Get the comparison instant for sorting based on the chosen dimension.
 *
 * @param mode - Chunking mode
 * @param item - Preference item
 * @returns date
 */
export function getComparisonTimeForRecord(
  mode: ChunkMode,
  item: PreferenceQueryResponseItem,
): Date {
  if (mode === 'timestamp') {
    return new Date(item.timestamp);
  }
  // mode === 'updated'
  return item.system?.updatedAt ? new Date(item.system.updatedAt) : new Date();
}
