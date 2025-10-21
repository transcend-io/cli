import type { ChunkMode, PreferencesQueryFilter } from './types';

/**
 * Convert a per-chunk window to half-open [after, before) by nudging `before` back 1ms.
 * This pairs cleanly with a backend that is inclusive when both bounds are supplied.
 *
 * If `before` is undefined (open-ended tail), we leave it as-is.
 * If `before - 1ms < after`, we clamp to `after` to avoid inverted windows.
 *
 * @param mode - The chunking mode
 * @param window - The per-chunk window
 * @returns half-open window
 */
export function consentIntervalToHalfOpen(
  mode: ChunkMode,
  window: PreferencesQueryFilter,
): PreferencesQueryFilter {
  const minus1 = (iso?: string): string | undefined =>
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
