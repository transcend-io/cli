import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { ChunkMode } from './types';
import { getComparisonTimeForRecord } from './getComparisonTimeForRecord';

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
    const ta = getComparisonTimeForRecord(mode, a).getTime();
    const tb = getComparisonTimeForRecord(mode, b).getTime();

    // Primary sort: time (newest → oldest)
    const timeDiff = tb - ta;
    if (timeDiff !== 0) return timeDiff;

    // Secondary sort: the other dimension time
    const otherMode: ChunkMode = mode === 'timestamp' ? 'updated' : 'timestamp';
    const ta2 = getComparisonTimeForRecord(otherMode, a).getTime();
    const tb2 = getComparisonTimeForRecord(otherMode, b).getTime();
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
