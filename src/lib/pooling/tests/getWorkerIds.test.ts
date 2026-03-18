import { describe, it, expect } from 'vitest';
import { getWorkerIds } from '../workerIds';

/**
 * Create a Map keyed by the provided ids.
 *
 * @param ids - numeric ids to use as keys
 * @returns a map with each id mapped to an empty object
 */
function makeMap(ids: number[]): Map<number, unknown> {
  const m = new Map<number, unknown>();
  ids.forEach((id) => m.set(id, {}));
  return m;
}

describe('getWorkerIds', () => {
  it('returns [] for an empty map', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getWorkerIds(new Map() as any)).toEqual([]);
  });

  it('returns numerically sorted ids (not lexicographic)', () => {
    // insertion is intentionally unsorted
    const m = makeMap([10, 2, 30]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getWorkerIds(m as any)).toEqual([2, 10, 30]);
  });

  it('preserves already sorted order', () => {
    const m = makeMap([1, 2, 3, 4]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getWorkerIds(m as any)).toEqual([1, 2, 3, 4]);
  });
});
