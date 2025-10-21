import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { ChunkMode } from './types';

/**
 * Get the comparison instant for sorting based on the chosen dimension.
 *
 * @param mode - Chunking mode
 * @param item - Preference item
 * @returns date
 */
function getItemInstant(
  mode: ChunkMode,
  item: PreferenceQueryResponseItem,
): Date {
  if (mode === 'timestamp') {
    return new Date(item.timestamp);
  }
  // mode === 'updated'
  return item.system?.updatedAt ? new Date(item.system.updatedAt) : new Date();
}

/**
 * Deterministic sort by the active dimension (descending: newest first), then by userId, then by first identifier
 *
 * @param preferences - The preferences to sort
 * @param mode - The chunk mode (timestamp or updated)
 * @returns sorted preferences
 */
export function sortConsentPreferences(
  preferences: PreferenceQueryResponseItem[],
  mode: ChunkMode,
): PreferenceQueryResponseItem[] {
  // Deterministic sort by the active dimension (descending: newest first), then by userId, then by first identifier
  preferences.sort((a, b) => {
    const ta = getItemInstant(mode, a).getTime();
    const tb = getItemInstant(mode, b).getTime();

    // Primary sort: time (newest → oldest)
    const timeDiff = tb - ta;
    if (timeDiff !== 0) return timeDiff;

    // Secondary sort: the other dimension time
    const otherMode: ChunkMode = mode === 'timestamp' ? 'updated' : 'timestamp';
    const ta2 = getItemInstant(otherMode, a).getTime();
    const tb2 = getItemInstant(otherMode, b).getTime();
    const otherTimeDiff = tb2 - ta2;
    if (otherTimeDiff !== 0) return otherTimeDiff;

    // Tertiary sort: userId (ascending)
    const userIdA = a.userId || '';
    const userIdB = b.userId || '';
    const userIdDiff = userIdA.localeCompare(userIdB);
    if (userIdDiff !== 0) return userIdDiff;

    // Quaternary sort: first identifier (ascending)
    const firstIdentifierA = a.identifiers?.[0]?.value || '';
    const firstIdentifierB = b.identifiers?.[0]?.value || '';
    return firstIdentifierA.localeCompare(firstIdentifierB);
  });
  return preferences;
}
