import { describe, it, expect } from 'vitest';
import { cycleWorkers } from '../workerIds';

/**
 * Convenience to run cycleWorkers and return result.
 *
 * @param ids - list of ids
 * @param current - current id or null
 * @param delta - movement
 * @returns next id or null when ids are empty
 */
function next(
  ids: number[],
  current: number | null,
  delta: number,
): number | null {
  return cycleWorkers(ids, current, delta);
}

describe('cycleWorkers', () => {
  it('returns null for empty id arrays regardless of current/delta', () => {
    expect(next([], null, 0)).toBeNull();
    expect(next([], 1, 1)).toBeNull();
    expect(next([], 1, -1)).toBeNull();
  });

  it('uses the first id when current is null or undefined', () => {
    const ids = [5, 7, 9];
    expect(next(ids, null, 0)).toBe(5); // delta 0 → first
    expect(next(ids, null, 1)).toBe(7); // forward one
    expect(next(ids, null, -1)).toBe(9); // wrap to last
  });

  it('starts from the first id if current is not found in array', () => {
    const ids = [10, 20, 30];
    expect(next(ids, 99, 0)).toBe(10);
    expect(next(ids, 99, 1)).toBe(20);
    expect(next(ids, 99, -1)).toBe(30);
  });

  it('moves forward and wraps with positive deltas', () => {
    const ids = [1, 2, 3];
    expect(next(ids, 1, 1)).toBe(2);
    expect(next(ids, 1, 2)).toBe(3);
    expect(next(ids, 2, 2)).toBe(1); // wrap
    expect(next(ids, 1, 5)).toBe(3); // large positive delta, modulo length
  });

  it('moves backward and wraps with negative deltas', () => {
    const ids = [4, 6, 8, 10];
    // current = 6 (index 1)
    expect(next(ids, 6, -1)).toBe(4); // (1-1)%4 = 0
    expect(next(ids, 6, -2)).toBe(10); // (1-2+4)%4 = 3
    // current = 10 (index 3)
    expect(next(ids, 10, -5)).toBe(8); // (3-5+4)%4 = 2
  });

  it('delta 0: returns current if present, else first', () => {
    const ids = [100, 200, 300];
    expect(next(ids, 200, 0)).toBe(200);
    expect(next(ids, 999, 0)).toBe(100); // not found → first
    expect(next(ids, null, 0)).toBe(100);
  });

  it('single-element ids array returns that element for any delta', () => {
    const ids = [42];
    expect(next(ids, 42, 0)).toBe(42);
    expect(next(ids, 42, 7)).toBe(42);
    expect(next(ids, 42, -3)).toBe(42);
    expect(next(ids, null, 999)).toBe(42);
  });
});
