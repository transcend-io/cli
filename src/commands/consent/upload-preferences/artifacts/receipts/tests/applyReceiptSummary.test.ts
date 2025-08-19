import { describe, it, expect, vi, beforeEach } from 'vitest';

import { applyReceiptSummary } from '../applyReceiptSummary';
import type { AnyTotals, CheckModeTotals, UploadModeTotals } from '../../../ui';

const H = vi.hoisted(() => {
  // capture last calls/args
  const calls = {
    summarize: [] as Array<unknown>,
    resolve: [] as Array<unknown>,
    readFailing: [] as Array<unknown>,
  };

  // default stubs (tests can override per-case)
  const stubs = {
    summarizeReceipt: vi.fn((): UploadModeTotals | CheckModeTotals => ({
      mode: 'upload' as const,
      success: 1,
      skipped: 2,
      error: 3,
      errors: { E1: 1 },
    })),
    resolveReceiptPath: vi.fn(() => '/resolved.json'),
    readFailingUpdatesFromReceipt: vi.fn(() => ['f1', 'f2']),
  };

  return { calls, stubs };
});

vi.mock('../summarizeReceipt', () => ({
  summarizeReceipt: vi.fn((...a: unknown[]) => {
    H.calls.summarize.push(a);
    return H.stubs.summarizeReceipt();
  }),
}));

vi.mock('../resolveReceiptPath', () => ({
  resolveReceiptPath: vi.fn((...a: unknown[]) => {
    H.calls.resolve.push(a);
    return H.stubs.resolveReceiptPath();
  }),
}));

vi.mock('../readFailingUpdatesFromReceipt', () => ({
  readFailingUpdatesFromReceipt: vi.fn((...a: unknown[]) => {
    H.calls.readFailing.push(a);
    return H.stubs.readFailingUpdatesFromReceipt();
  }),
}));

describe('applyReceiptSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.calls.summarize = [];
    H.calls.resolve = [];
    H.calls.readFailing = [];
    // reset stubs to defaults
    H.stubs.summarizeReceipt.mockImplementation(() => ({
      mode: 'upload',
      success: 1,
      skipped: 2,
      error: 3,
      errors: { E1: 1 },
    }));
    H.stubs.resolveReceiptPath.mockImplementation(() => '/resolved.json');
    H.stubs.readFailingUpdatesFromReceipt.mockImplementation(() => [
      'f1',
      'f2',
    ]);
  });

  it('returns early when resolved path is falsy', () => {
    H.stubs.resolveReceiptPath.mockReturnValue('');

    const agg: AnyTotals = {
      mode: 'upload',
      success: 0,
      skipped: 0,
      error: 0,
      errors: {},
    };
    const failing: unknown[] = [];

    applyReceiptSummary({
      receiptsFolder: '/receipts',
      filePath: '/abs/file.csv',
      receiptFilepath: undefined,
      agg,
      dryRun: false,
      failingUpdatesMem: failing,
    });

    // no downstream calls
    expect(H.calls.summarize.length).toBe(0);
    expect(H.calls.readFailing.length).toBe(0);
    // no changes
    expect(agg).toEqual({
      mode: 'upload',
      success: 0,
      skipped: 0,
      error: 0,
      errors: {},
    });
    expect(failing).toEqual([]);
  });

  it('uses provided receiptFilepath when present and non-empty', () => {
    const agg: AnyTotals = {
      mode: 'upload',
      success: 0,
      skipped: 0,
      error: 0,
      errors: {},
    };
    const failing: unknown[] = [];

    applyReceiptSummary({
      receiptsFolder: '/receipts',
      filePath: '/abs/file.csv',
      receiptFilepath: '/explicit.json',
      agg,
      dryRun: true,
      failingUpdatesMem: failing,
    });

    // resolveReceiptPath should NOT be called when receiptFilepath is provided
    expect(H.calls.resolve.length).toBe(0);

    // summarizeReceipt receives explicit path and dryRun flag
    expect(H.calls.summarize[0]).toEqual(['/explicit.json', true]);

    // readFailingUpdatesFromReceipt called with explicit path and original filePath
    expect(H.calls.readFailing[0]).toEqual(['/explicit.json', '/abs/file.csv']);

    // defaults (upload) merged into agg
    expect(agg).toEqual({
      mode: 'upload',
      success: 1,
      skipped: 2,
      error: 3,
      errors: { E1: 1 },
    });

    // failing entries pushed
    expect(failing).toEqual(['f1', 'f2']);
  });

  it('resolves path when receiptFilepath is undefined/null/empty', () => {
    const agg: AnyTotals = {
      mode: 'upload',
      success: 0,
      skipped: 0,
      error: 0,
      errors: {},
    };
    const failing: unknown[] = [];

    applyReceiptSummary({
      receiptsFolder: '/receipts',
      filePath: '/abs/file.csv',
      receiptFilepath: null,
      agg,
      dryRun: false,
      failingUpdatesMem: failing,
    });

    expect(H.calls.resolve[0]).toEqual(['/receipts', '/abs/file.csv']);
    expect(H.calls.summarize[0]).toEqual(['/resolved.json', false]);
    expect(H.calls.readFailing[0]).toEqual(['/resolved.json', '/abs/file.csv']);
  });

  it('merges upload totals and accumulates errors per key', () => {
    // First receipt: upload with two error keys
    H.stubs.summarizeReceipt.mockReturnValueOnce({
      mode: 'upload' as const,
      success: 5,
      skipped: 1,
      error: 2,
      errors: { E1: 2, E2: 1 },
    });
    H.stubs.readFailingUpdatesFromReceipt.mockReturnValueOnce(['a']);

    // Second receipt: upload with overlapping keys
    H.stubs.summarizeReceipt.mockReturnValueOnce({
      mode: 'upload' as const,
      success: 3,
      skipped: 0,
      error: 1,
      errors: { E1: 4, E3: 1 },
    });
    H.stubs.readFailingUpdatesFromReceipt.mockReturnValueOnce(['b', 'c']);

    const agg: UploadModeTotals = {
      mode: 'upload',
      success: 10,
      skipped: 2,
      error: 0,
      errors: { E1: 1 },
    };
    const failing: unknown[] = [];

    // apply twice to simulate multiple receipts
    applyReceiptSummary({
      receiptsFolder: '/r',
      filePath: '/f1.csv',
      agg,
      dryRun: false,
      failingUpdatesMem: failing,
    });
    applyReceiptSummary({
      receiptsFolder: '/r',
      filePath: '/f2.csv',
      agg,
      dryRun: false,
      failingUpdatesMem: failing,
    });

    expect(agg).toEqual({
      mode: 'upload',
      success: 10 + 5 + 3, // 18
      skipped: 2 + 1 + 0, // 3
      error: 0 + 2 + 1, // 3
      errors: {
        // start with E1:1, add receipt1(E1:2), receipt2(E1:4)
        E1: 1 + 2 + 4, // 7
        E2: 1, // from receipt1
        E3: 1, // from receipt2
      },
    });

    expect(failing).toEqual(['a', 'b', 'c']);
  });

  it('merges check totals correctly', () => {
    H.stubs.summarizeReceipt.mockReturnValue({
      mode: 'check' as const,
      totalPending: 9,
      pendingConflicts: 4,
      pendingSafe: 5,
      skipped: 2,
    });
    H.stubs.readFailingUpdatesFromReceipt.mockReturnValue(['x']);

    const agg: CheckModeTotals = {
      mode: 'check',
      totalPending: 1,
      pendingConflicts: 2,
      pendingSafe: 3,
      skipped: 4,
    };
    const failing: unknown[] = [];

    applyReceiptSummary({
      receiptsFolder: '/r',
      filePath: '/f.csv',
      agg,
      dryRun: false,
      failingUpdatesMem: failing,
    });

    expect(agg).toEqual({
      mode: 'check',
      totalPending: 1 + 9, // 10
      pendingConflicts: 2 + 4, // 6
      pendingSafe: 3 + 5, // 8
      skipped: 4 + 2, // 6
    });

    expect(failing).toEqual(['x']);
  });

  it('does not cross-merge mismatched modes (upload summary into check agg and vice versa)', () => {
    // upload summary + check agg → no merge changes
    H.stubs.summarizeReceipt.mockReturnValueOnce({
      mode: 'upload' as const,
      success: 10,
      skipped: 1,
      error: 2,
      errors: { E: 10 },
    });

    const aggCheck: CheckModeTotals = {
      mode: 'check',
      totalPending: 1,
      pendingConflicts: 1,
      pendingSafe: 1,
      skipped: 1,
    };
    const failing1: unknown[] = [];

    applyReceiptSummary({
      receiptsFolder: '/r',
      filePath: '/f.csv',
      agg: aggCheck,
      dryRun: false,
      failingUpdatesMem: failing1,
    });

    expect(aggCheck).toEqual({
      mode: 'check',
      totalPending: 1,
      pendingConflicts: 1,
      pendingSafe: 1,
      skipped: 1,
    });

    // check summary + upload agg → no merge changes
    H.stubs.summarizeReceipt.mockReturnValueOnce({
      mode: 'check' as const,
      totalPending: 7,
      pendingConflicts: 2,
      pendingSafe: 5,
      skipped: 0,
    });

    const aggUpload: UploadModeTotals = {
      mode: 'upload',
      success: 1,
      skipped: 2,
      error: 3,
      errors: { E0: 1 },
    };
    const failing2: unknown[] = [];

    applyReceiptSummary({
      receiptsFolder: '/r',
      filePath: '/f2.csv',
      agg: aggUpload,
      dryRun: false,
      failingUpdatesMem: failing2,
    });

    expect(aggUpload).toEqual({
      mode: 'upload',
      success: 1,
      skipped: 2,
      error: 3,
      errors: { E0: 1 },
    });
  });
});
