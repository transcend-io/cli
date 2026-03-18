import { describe, it, expect, vi, beforeEach } from 'vitest';

import { summarizeReceipt } from '../summarizeReceipt';

// --- Hoisted fs mock ----------------------------------------------------------
const H = vi.hoisted(() => ({
  readFileSync: vi.fn() as unknown as (path: string, enc: string) => string,
}));

// Mock BEFORE SUT import
vi.mock('node:fs', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readFileSync: (...a: unknown[]) => (H.readFileSync as any)(...a),
}));

describe('summarizeReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upload mode: counts success/error/skipped and aggregates errors by message', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce(
      JSON.stringify({
        successfulUpdates: {
          a: {},
          b: {},
          c: {},
        },
        failingUpdates: {
          f1: { error: 'Bad input' },
          f2: { error: 'Bad input' },
          f3: { error: 'Network' },
          f4: {}, // missing error -> "Unknown error"
        },
        skippedUpdates: {
          s1: {},
          s2: {},
        },
      }),
    );

    const out = summarizeReceipt('/r/receipt.json', /* dryRun */ false);

    expect(H.readFileSync).toHaveBeenCalledWith('/r/receipt.json', 'utf8');

    expect(out).toEqual({
      mode: 'upload',
      success: 3, // a,b,c
      error: 4, // f1..f4
      skipped: 2, // s1,s2
      errors: {
        'Bad input': 2,
        Network: 1,
        'Unknown error': 1,
      },
    });
  });

  it('upload mode: missing sections are treated as empty', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce(JSON.stringify({}));

    const out = summarizeReceipt('/r/empty.json', false);

    expect(out).toEqual({
      mode: 'upload',
      success: 0,
      error: 0,
      skipped: 0,
      errors: {},
    });
  });

  it('check mode: counts pending, conflicts, safe, and skipped', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce(
      JSON.stringify({
        pendingUpdates: { p1: {}, p2: {}, p3: {} },
        pendingConflictUpdates: { c1: {}, c2: {} },
        pendingSafeUpdates: { s1: {}, s2: {}, s3: {}, s4: {} },
        skippedUpdates: { k1: {} },
      }),
    );

    const out = summarizeReceipt('/r/check.json', /* dryRun */ true);

    expect(H.readFileSync).toHaveBeenCalledWith('/r/check.json', 'utf8');

    expect(out).toEqual({
      mode: 'check',
      totalPending: 3,
      pendingConflicts: 2,
      pendingSafe: 4,
      skipped: 1,
    });
  });

  it('check mode: missing sections are treated as empty', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce(JSON.stringify({}));

    const out = summarizeReceipt('/r/empty.json', true);

    expect(out).toEqual({
      mode: 'check',
      totalPending: 0,
      pendingConflicts: 0,
      pendingSafe: 0,
      skipped: 0,
    });
  });

  it('returns zeroed defaults on invalid JSON (upload mode)', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce('{not json');

    const out = summarizeReceipt('/r/bad.json', false);

    expect(out).toEqual({
      mode: 'upload',
      success: 0,
      error: 0,
      skipped: 0,
      errors: {},
    });
  });

  it('returns zeroed defaults on invalid JSON (check mode)', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce('{not json');

    const out = summarizeReceipt('/r/bad.json', true);

    expect(out).toEqual({
      mode: 'check',
      totalPending: 0,
      pendingConflicts: 0,
      pendingSafe: 0,
      skipped: 0,
    });
  });

  it('returns zeroed defaults when readFileSync throws (both modes)', () => {
    H.readFileSync = vi.fn(() => {
      throw new Error('ENOENT');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const upload = summarizeReceipt('/r/missing.json', false);
    expect(upload).toEqual({
      mode: 'upload',
      success: 0,
      error: 0,
      skipped: 0,
      errors: {},
    });

    const check = summarizeReceipt('/r/missing.json', true);
    expect(check).toEqual({
      mode: 'check',
      totalPending: 0,
      pendingConflicts: 0,
      pendingSafe: 0,
      skipped: 0,
    });
  });
});
