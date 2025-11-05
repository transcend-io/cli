import { describe, it, expect } from 'vitest';
import { buildConsentChunks } from '../buildConsentChunks';
import type { PreferencesQueryFilter } from '../types';

const d = (iso: string): Date => new Date(iso);

const tsRange = (f: PreferencesQueryFilter): [string, string] => [
  f.timestampAfter!,
  f.timestampBefore!,
];
const updRange = (f: PreferencesQueryFilter): [string, string] => [
  f.system!.updatedAfter!,
  f.system!.updatedBefore!,
];

describe('buildConsentChunks', () => {
  it('returns [] when lower === upperExclusive', () => {
    const lower = d('2025-01-01T00:00:00.000Z');
    const upper = d('2025-01-01T00:00:00.000Z');
    expect(buildConsentChunks('timestamp', lower, upper, 10)).toEqual([]);
    expect(buildConsentChunks('updated', lower, upper, 10)).toEqual([]);
  });

  it(
    'snaps start to the nearest 5-minute boundary and emits fixed steps with ' +
      'a short tail (timestamp mode), half-open via -1ms',
    () => {
      // lower not on the hour; upper 6h later
      const lower = d('2025-01-01T10:15:00.000Z');
      const upper = d('2025-01-01T16:15:00.000Z');
      // total ≈ 6h, maxChunks=3 → chunk≈2h
      // Start snapped to 10:15 (nearest 5-min floor); expect:
      // [10:15–12:15), [12:15–14:15), [14:15–16:15) → no tail (exact coverage)
      const chunks = buildConsentChunks('timestamp', lower, upper, 3);

      expect(chunks).toHaveLength(3);

      expect(tsRange(chunks[0])).toEqual([
        '2025-01-01T10:15:00.000Z',
        '2025-01-01T12:14:59.999Z',
      ]);
      expect(tsRange(chunks[1])).toEqual([
        '2025-01-01T12:15:00.000Z',
        '2025-01-01T14:14:59.999Z',
      ]);
      expect(tsRange(chunks[2])).toEqual([
        '2025-01-01T14:15:00.000Z',
        '2025-01-01T16:14:59.999Z',
      ]);
    },
  );

  it('enforces a minimum chunk span of 5 minutes for tiny windows (timestamp mode)', () => {
    const lower = d('2025-01-01T10:05:00.000Z');
    const upper = d('2025-01-01T10:20:00.000Z');
    const chunks = buildConsentChunks('timestamp', lower, upper, 999);

    // Start snaps to 10:05; end is exclusive 10:20 → inclusive 10:19:59.999
    // With a 5-minute minimum, expect three 5-minute chunks covering [10:05, 10:20)
    expect(chunks).toHaveLength(3);
    expect(tsRange(chunks[0])).toEqual([
      '2025-01-01T10:05:00.000Z',
      '2025-01-01T10:09:59.999Z',
    ]);
    expect(tsRange(chunks[1])).toEqual([
      '2025-01-01T10:10:00.000Z',
      '2025-01-01T10:14:59.999Z',
    ]);
    expect(tsRange(chunks[2])).toEqual([
      '2025-01-01T10:15:00.000Z',
      '2025-01-01T10:19:59.999Z',
    ]);
  });

  it('produces system.updated* fields with fixed steps and a short tail (updated mode)', () => {
    const lower = d('2025-02-01T01:23:45.000Z');
    const upper = d('2025-02-01T05:23:45.000Z');
    // total ≈ 4h, maxChunks=4 → chunk≈1h; start snaps to 01:20
    // Expect 4 full 1h chunks plus a short tail
    const chunks = buildConsentChunks('updated', lower, upper, 4);

    expect(chunks).toHaveLength(5);

    expect(updRange(chunks[0])).toEqual([
      '2025-02-01T01:20:00.000Z',
      '2025-02-01T02:19:59.999Z',
    ]);
    expect(updRange(chunks[1])).toEqual([
      '2025-02-01T02:20:00.000Z',
      '2025-02-01T03:19:59.999Z',
    ]);
    expect(updRange(chunks[2])).toEqual([
      '2025-02-01T03:20:00.000Z',
      '2025-02-01T04:19:59.999Z',
    ]);
    expect(updRange(chunks[3])).toEqual([
      '2025-02-01T04:20:00.000Z',
      '2025-02-01T05:19:59.999Z',
    ]);
    expect(updRange(chunks[4])).toEqual([
      '2025-02-01T05:20:00.000Z',
      '2025-02-01T05:23:44.999Z',
    ]);
  });

  it('caps the number of chunks by increasing chunk size when maxChunks is small', () => {
    const lower = d('2025-03-10T00:00:00.000Z');
    const upper = d('2025-03-10T10:00:00.000Z');
    // 10h total, maxChunks=2 → chunk=5h
    const chunks = buildConsentChunks('timestamp', lower, upper, 2);

    expect(chunks).toHaveLength(2);
    expect(tsRange(chunks[0])).toEqual([
      '2025-03-10T00:00:00.000Z',
      '2025-03-10T04:59:59.999Z',
    ]);
    expect(tsRange(chunks[1])).toEqual([
      '2025-03-10T05:00:00.000Z',
      '2025-03-10T09:59:59.999Z',
    ]);
  });
});
