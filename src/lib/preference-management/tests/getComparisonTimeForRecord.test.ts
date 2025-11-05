import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getComparisonTimeForRecord } from '../getComparisonTimeForRecord';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

describe('getComparisonTimeForRecord', () => {
  const mkItem = (
    partial: Partial<PreferenceQueryResponseItem>,
  ): PreferenceQueryResponseItem =>
    ({
      // minimal defaults
      timestamp: '2025-01-01T00:00:00.000Z',
      system: {},
      ...partial,
    } as PreferenceQueryResponseItem);

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns item.timestamp when mode is "timestamp"', () => {
    const item = mkItem({
      timestamp: '2025-01-02T03:04:05.000Z',
      system: {
        decryptionStatus: 'DECRYPTED',
        updatedAt: '2025-01-02T04:00:00.000Z',
      }, // ensure timestamp wins
    });

    const d = getComparisonTimeForRecord('timestamp', item);
    expect(d.toISOString()).toBe('2025-01-02T03:04:05.000Z');
  });

  it('returns system.updatedAt when mode is "updated" and updatedAt is present', () => {
    const item = mkItem({
      timestamp: '2025-02-01T01:02:03.000Z',
      system: {
        decryptionStatus: 'DECRYPTED',
        updatedAt: '2025-02-02T10:11:12.000Z',
      },
    });

    const d = getComparisonTimeForRecord('updated', item);
    expect(d.toISOString()).toBe('2025-02-02T10:11:12.000Z');
  });

  it('falls back to current time when mode is "updated" and updatedAt is missing', () => {
    const fakeNow = new Date('2025-03-04T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);

    const item = mkItem({
      timestamp: '2025-03-01T00:00:00.000Z',
      system: { decryptionStatus: 'DECRYPTED' }, // no updatedAt
    });

    const d = getComparisonTimeForRecord('updated', item);
    expect(d.toISOString()).toBe(fakeNow.toISOString());
  });
});
