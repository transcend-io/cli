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

  it('snaps start to the hour and emits fixed steps with a short tail (timestamp mode), half-open via -1ms', () => {
    // lower not on the hour; upper 6h later
    const lower = d('2025-01-01T10:15:00.000Z');
    const upper = d('2025-01-01T16:15:00.000Z');
    // total ≈ 6h, maxChunks=3 → chunk≈2h
    // Start snapped to 10:00; expect:
    // [10–12), [12–14), [14–16), tail [16–16:15)
    const chunks = buildConsentChunks('timestamp', lower, upper, 3);

    expect(chunks).toHaveLength(4);

    expect(tsRange(chunks[0])).toEqual([
      '2025-01-01T10:00:00.000Z',
      '2025-01-01T11:59:59.999Z',
    ]);
    expect(tsRange(chunks[1])).toEqual([
      '2025-01-01T12:00:00.000Z',
      '2025-01-01T13:59:59.999Z',
    ]);
    expect(tsRange(chunks[2])).toEqual([
      '2025-01-01T14:00:00.000Z',
      '2025-01-01T15:59:59.999Z',
    ]);
    expect(tsRange(chunks[3])).toEqual([
      '2025-01-01T16:00:00.000Z',
      '2025-01-01T16:14:59.999Z',
    ]);
  });

  it('enforces a minimum chunk span of 1 hour for tiny windows (timestamp mode)', () => {
    const lower = d('2025-01-01T10:05:00.000Z');
    const upper = d('2025-01-01T10:20:00.000Z');
    const chunks = buildConsentChunks('timestamp', lower, upper, 999);

    // Start snaps to 10:00; end is exclusive 10:20 → inclusive 10:19:59.999
    expect(chunks).toHaveLength(1);
    expect(tsRange(chunks[0])).toEqual([
      '2025-01-01T10:00:00.000Z',
      '2025-01-01T10:19:59.999Z',
    ]);
  });

  it('produces system.updated* fields with a short tail and half-open ends (updated mode)', () => {
    const lower = d('2025-02-01T01:23:45.000Z');
    const upper = d('2025-02-01T05:23:45.000Z');
    // total ≈ 4h, maxChunks=4 → chunk≈1h; expect 5 chunks due to tail
    const chunks = buildConsentChunks('updated', lower, upper, 4);

    expect(chunks).toHaveLength(5);

    expect(updRange(chunks[0])).toEqual([
      '2025-02-01T01:00:00.000Z',
      '2025-02-01T01:59:59.999Z',
    ]);
    expect(updRange(chunks[1])).toEqual([
      '2025-02-01T02:00:00.000Z',
      '2025-02-01T02:59:59.999Z',
    ]);
    expect(updRange(chunks[2])).toEqual([
      '2025-02-01T03:00:00.000Z',
      '2025-02-01T03:59:59.999Z',
    ]);
    expect(updRange(chunks[3])).toEqual([
      '2025-02-01T04:00:00.000Z',
      '2025-02-01T04:59:59.999Z',
    ]);
    expect(updRange(chunks[4])).toEqual([
      '2025-02-01T05:00:00.000Z',
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
