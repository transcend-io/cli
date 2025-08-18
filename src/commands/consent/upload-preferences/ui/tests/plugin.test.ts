import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/* colors → identity (include magenta for ETA) */
vi.mock('colors', () => ({
  default: {
    bold: (s: string) => s,
    dim: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    cyan: (s: string) => s,
    magenta: (s: string) => s,
  },
}));

// Import SUT after mocks
const { uploadPreferencesPlugin } = await import('../plugin');

/* ---------- Local test types & helpers ---------- */

type SlotProgress = {
  filePath?: string;
  processed?: number;
  total?: number;
};

type SlotState<TProg> = {
  busy: boolean;
  file: string | null;
  startedAt: number | null;
  lastLevel: 'ok' | 'warn' | 'error' | 'info';
  progress?: TProg;
};

type Throughput = { successSoFar: number; r10s: number; r60s: number };

type Ctx<TTotals> = {
  title: string;
  poolSize: number;
  cpuCount: number;
  filesTotal: number;
  filesCompleted: number;
  filesFailed: number;
  workerState: Map<number, SlotState<SlotProgress>>;
  totals: TTotals;
  throughput: Throughput;
  final: boolean;
  exportStatus?: Record<string, unknown>;
};

/**
 * Build a baseline ctx that tests can tweak via partial overrides.
 *
 * @param over - Partial overrides for the base context.
 * @returns A complete context object with the provided overrides applied.
 */
function baseCtx<TTotals>(
  over: Partial<Ctx<TTotals>> & { totals: TTotals },
): Ctx<TTotals> {
  return {
    title: 'Upload Prefs',
    poolSize: 2,
    cpuCount: 8,
    filesTotal: 10,
    filesCompleted: 0,
    filesFailed: 0,
    workerState: new Map(),
    throughput: { successSoFar: 0, r10s: 0, r60s: 0 },
    final: false,
    ...over,
  };
}

describe('uploadPreferencesPlugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renderHeader: upload totals -> shows metrics line, receipts totals, and error breakdown', () => {
    const workers = new Map<number, SlotState<SlotProgress>>([
      [
        0,
        {
          busy: true,
          file: '/abs/a.csv',
          startedAt: Date.now(),
          lastLevel: 'ok',
          progress: { processed: 2, total: 6 },
        },
      ],
      [
        1,
        {
          busy: true,
          file: '/abs/b.csv',
          startedAt: Date.now(),
          lastLevel: 'ok',
          progress: { processed: 1 }, // total unknown
        },
      ],
    ]);

    const totals = {
      mode: 'upload' as const,
      success: 10,
      skipped: 2,
      error: 3,
      errors: { Oops: 2 },
    };

    // avg jobs/file = (10+2+3)/5 = 3
    // inflightKnown=6; remaining = 10-5-2 = 3
    // est = 15 + 6 + 3*3 = 30; processedJobs=15
    // r60s=0.5 ⇒ jobs/hr = 0.5 * 3 * 3600 = 5400 ⇒ ETA ≈ 10s
    const ctx = baseCtx({
      totals,
      workerState: workers,
      filesCompleted: 5,
      filesFailed: 0,
      throughput: { successSoFar: 5, r10s: 0, r60s: 0.5 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = uploadPreferencesPlugin.renderHeader(ctx as any);

    // Real header starts with the title + workers / CPU; don’t depend on exact styling
    expect(lines[0]).toMatch(/^Upload Prefs — 2 workers/);

    const metrics = lines.find((l) => l.includes('Est. total jobs'));
    expect(metrics).toBeDefined();
    expect(metrics as string).toContain('Est. total jobs: 30');
    expect(metrics as string).toContain('ETA 10s');

    const receipts = lines.join('\n');
    expect(receipts).toContain('Receipts totals');
    expect(receipts).toContain('Success: 10');
    expect(receipts).toContain('Skipped: 2');
    expect(receipts).toContain('Error: 3');
    expect(receipts).toContain('Error breakdown:');
    expect(receipts).toContain('Oops');
  });

  it('renderHeader: check totals -> shows pending/pendingConflicts/pendingSafe and no ETA when not computable', () => {
    const totals = {
      mode: 'check' as const,
      pendingConflicts: 7,
      pendingSafe: 11,
      totalPending: 18,
      skipped: 2,
    };
    const ctx = baseCtx({
      totals,
      workerState: new Map(),
      filesCompleted: 0,
      filesFailed: 0,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = uploadPreferencesPlugin.renderHeader(ctx as any);

    // Real header’s line 0 is the formatted title line
    expect(lines[0]).toMatch(/^Upload Prefs — 2 workers/);

    const metrics = lines.find((l) => l.includes('Est. total jobs'));
    expect(metrics).toBeDefined();
    expect(metrics as string).toContain('Est. total jobs: —');
    expect(metrics as string).not.toContain('ETA');

    const block = lines.join('\n');
    expect(block).toContain('Pending: 18');
    expect(block).toContain('PendingConflicts: 7');
    expect(block).toContain('PendingSafe: 11');
    expect(block).toContain('Skipped: 2');
  });

  it('renderWorkers: renders real worker rows (no delegation mock)', () => {
    // One idle, one working with known totals
    const workers = new Map<number, SlotState<SlotProgress>>([
      [
        0,
        {
          busy: false,
          file: null,
          startedAt: null,
          lastLevel: 'ok',
        },
      ],
      [
        1,
        {
          busy: true,
          file: '/abs/a.csv',
          startedAt: Date.now() - 5000,
          lastLevel: 'ok',
          progress: { processed: 3, total: 6 },
        },
      ],
    ]);

    const ctx = baseCtx({
      totals: {
        mode: 'upload' as const,
        success: 0,
        skipped: 0,
        error: 0,
        errors: {},
      },
      workerState: workers,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = uploadPreferencesPlugin.renderWorkers(ctx as any);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(2);

    // Row 0: idle
    expect(rows[0]).toContain('IDLE');

    // Row 1: working, shows file basename and mini-bar bracket
    expect(rows[1]).toContain('[w1]');
    expect(rows[1]).toContain('a.csv');
    expect(rows[1]).toMatch(/\[\S/); // has a mini bar like [██...
  });

  it('renderExtras: lists exports with OSC-8 links and last saved times', () => {
    const status = {
      error: {
        path: '/abs/errors.log',
        exported: true,
        savedAt: 1_725_000_000_000,
      },
      warn: { path: '/abs/warns.log', exported: false, savedAt: undefined },
      info: {
        path: 'file:///already/url/info.log',
        exported: true,
        savedAt: 1_725_000_100_000,
      },
      all: undefined,
      failuresCsv: { path: '(not saved yet)', exported: false },
    };

    const ctx = baseCtx({
      totals: {
        mode: 'upload' as const,
        success: 0,
        skipped: 0,
        error: 0,
        errors: {},
      },
      exportStatus: status,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = uploadPreferencesPlugin.renderExtras?.(ctx as any) || [];
    expect(lines[0]).toContain('Exports (Cmd/Ctrl-click “open”');

    const eLine = lines[1];
    const eHref = pathToFileURL(resolve('/abs/errors.log')).href;
    expect(eLine).toContain('E=export-errors');
    expect(eLine).toContain('open');
    expect(eLine).toContain(eHref);

    const wLine = lines[2];
    const wHref = pathToFileURL(resolve('/abs/warns.log')).href;
    expect(wLine).toContain('W=export-warns');
    expect(wLine).toContain(wHref);

    const iLine = lines[3];
    expect(iLine).toContain('I=export-info');
    expect(iLine).toContain('file:///already/url/info.log');

    const aLine = lines[4];
    expect(aLine).toContain('A=export-all');
    expect(aLine).toContain('(not saved yet)');

    const fLine = lines[5];
    expect(fLine).toContain('F=export-failures-csv');
    expect(fLine).toContain('(not saved yet)');
  });
});
