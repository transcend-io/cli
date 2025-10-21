import { describe, it, expect } from 'vitest';
import { pickConsentChunkMode } from '../pickConsentChunkMode';
import type { PreferencesQueryFilter, ChunkMode } from '../types';

describe('pickConsentChunkMode', () => {
  const M = (f: PreferencesQueryFilter): ChunkMode => pickConsentChunkMode(f);

  it('returns "updated" for an empty filter', () => {
    expect(M({})).toBe('updated');
  });

  it('returns "timestamp" when timestampAfter is present', () => {
    expect(M({ timestampAfter: '2025-01-01T00:00:00.000Z' })).toBe('timestamp');
  });

  it('returns "timestamp" when timestampBefore is present', () => {
    expect(M({ timestampBefore: '2025-01-02T00:00:00.000Z' })).toBe(
      'timestamp',
    );
  });

  it('returns "timestamp" when either timestamp bound is present even if system.updated* is also present', () => {
    expect(
      M({
        timestampAfter: '2025-01-01T00:00:00.000Z',
        system: { updatedAfter: '2025-01-01T00:00:00.000Z' },
      }),
    ).toBe('timestamp');

    expect(
      M({
        timestampBefore: '2025-01-02T00:00:00.000Z',
        system: { updatedBefore: '2025-01-03T00:00:00.000Z' },
      }),
    ).toBe('timestamp');
  });

  it('returns "updated" when no timestamp bounds are present but system.updated* is present', () => {
    expect(M({ system: { updatedAfter: '2025-01-01T00:00:00.000Z' } })).toBe(
      'updated',
    );

    expect(M({ system: { updatedBefore: '2025-01-03T00:00:00.000Z' } })).toBe(
      'updated',
    );

    expect(
      M({
        system: {
          updatedAfter: '2025-01-01T00:00:00.000Z',
          updatedBefore: '2025-01-02T00:00:00.000Z',
        },
      }),
    ).toBe('updated');
  });
});
