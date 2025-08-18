import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pathToFileURL } from 'node:url';

import {
  headerLines,
  totalsBlock,
  workerLines,
  hotkeysLine,
  exportBlock,
} from '../headerLines';

const H = vi.hoisted(() => ({
  osc8Spy: vi.fn((abs: string, label?: string) => `[OSC8:${label ?? abs}]`),
}));

// Mock colors as identity fns for simpler assertions
vi.mock('colors', () => {
  const id = (s: string): string => s;
  return {
    default: {
      bold: id,
      dim: id,
      red: id,
      green: id,
      yellow: id,
      cyan: id,
      magenta: id,
    },
  };
});

// Mock osc8Link via the exact module path used by the SUT
vi.mock('../../../../../lib/pooling', () => ({
  osc8Link: H.osc8Spy,
}));

/* -------------------------------- Test body -------------------------------- */
describe('headerLines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T03:04:05.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('headerLines: renders uploader header, files stats, progress bar, exports dir, throughput, and est jobs', () => {
    const model = {
      input: {
        poolSize: 3,
        cpuCount: 8,
        filesTotal: 10,
        filesCompleted: 4,
        filesFailed: 1,
        exportsDir: '/exp',
        throughput: { r10s: 1, r60s: 0.5, successSoFar: 7 },
      },
      inProgress: 2,
      pct: 50,
      etaText: '~1m',
      estTotalJobs: 1234.4,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = headerLines(model as any);

    expect(lines[0]).toContain('Parallel uploader');
    expect(lines[0]).toContain('3 workers');
    expect(lines[0]).toContain('(CPU avail: 8)');

    expect(lines[1]).toContain('Files 10');
    expect(lines[1]).toContain('Completed 4');
    expect(lines[1]).toContain('Failed 1');
    expect(lines[1]).toContain('In-flight 2');

    // Progress bar line includes percentage and ETA
    expect(lines[2]).toContain('50%');
    expect(lines[2]).toContain('~1m');

    // Exports dir
    expect(lines.some((l) => l.includes('Exports dir: /exp'))).toBe(true);

    // Throughput: 1 * 3600 = 3600/hr; 0.5 * 3600 = 1800/hr
    expect(
      lines.some((l) => l.includes('Throughput: 3,600/hr (1h: 1,800/hr)')),
    ).toBe(true);

    // Est total jobs rounded
    expect(lines[2]).toContain('Est. total jobs: 1,234');
  });

  it('totalsBlock: upload mode shows error breakdown and receipts totals', () => {
    const uploadTotals = {
      mode: 'upload',
      success: 2,
      skipped: 3,
      error: 1,
      errors: { Oops: 2, Bad: 1 },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = totalsBlock(uploadTotals as any);
    expect(out).toContain('Error breakdown:');
    expect(out).toContain('Count[2] Oops');
    expect(out).toContain('Count[1] Bad');
    expect(out).toContain('Receipts totals');
    expect(out).toContain('Success: 2');
    expect(out).toContain('Skipped: 3');
    expect(out).toContain('Error: 1');
  });

  it('totalsBlock: check mode summarizes pending and skipped', () => {
    const checkTotals = {
      mode: 'check',
      totalPending: 5,
      pendingConflicts: 2,
      pendingSafe: 3,
      skipped: 1,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = totalsBlock(checkTotals as any);
    expect(out).toContain('Receipts totals');
    expect(out).toContain('Pending: 5');
    expect(out).toContain('PendingConflicts: 2');
    expect(out).toContain('PendingSafe: 3');
    expect(out).toContain('Skipped: 1');
  });

  it('workerLines: shows status badges, filename, elapsed, and mini progress bar', () => {
    const now = Date.now();
    const workerState = new Map<number, unknown>([
      [
        1,
        {
          busy: true,
          file: '/path/to/file1.csv',
          startedAt: now - 5000,
          lastLevel: 'ok',
          progress: { processed: 50, total: 100 },
        },
      ],
      [
        2,
        {
          busy: false,
          file: null,
          startedAt: null,
          lastLevel: 'warn',
          progress: undefined,
        },
      ],
      [
        3,
        {
          busy: false,
          file: null,
          startedAt: null,
          lastLevel: 'error',
          progress: undefined,
        },
      ],
    ]);

    const model = {
      input: { workerState },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = workerLines(model as any);

    // w1: WORKING, file basename, ~5s elapsed, 50/100 and 50% mini bar (18 cols => 9 filled)
    const l1 = lines.find((s) => s.includes('[w1]'))!;
    expect(l1).toContain('WORKING');
    expect(l1).toContain('file1.csv');
    expect(l1).toContain('5s');
    expect(l1).toContain('50/100 (50%)');
    expect(l1).toMatch(/\[█{9}░{9}\]/);

    // w2: WARN badge, idle mini text
    const l2 = lines.find((s) => s.includes('[w2]'))!;
    expect(l2).toContain('WARN');
    expect(l2).toContain('—'); // dim mini text for no totals

    // w3: ERROR badge
    const l3 = lines.find((s) => s.includes('[w3]'))!;
    expect(l3).toContain('ERROR');
  });

  it('hotkeysLine: varies by pool size and final flag', () => {
    expect(hotkeysLine(1)).toContain('Hotkeys: [0] attach');
    expect(hotkeysLine(5)).toContain('Hotkeys: [0-4] attach');
    expect(hotkeysLine(15)).toContain('(Tab/Shift+Tab for ≥10)');

    expect(hotkeysLine(3, true)).toContain(
      'Run complete — digits to view logs',
    );
    expect(hotkeysLine(3, true)).toContain('q to quit');
  });

  it('exportBlock: renders lines with resolved paths, OSC8 open links, and file:// URLs', () => {
    const exportStatus = {
      error: {
        path: '/exp/combined-errors.log',
        savedAt: 1700000000000,
        exported: true,
      },
      warn: {
        path: '/exp/combined-warns.log',
        savedAt: 1700000001000,
        exported: false,
      },
      info: {
        path: '/exp/combined-info.log',
        savedAt: 1700000002000,
        exported: true,
      },
      all: {
        path: '/exp/combined-all.log',
        savedAt: 1700000003000,
        exported: true,
      },
      failuresCsv: {
        path: '/exp/failing-updates.csv',
        savedAt: 1700000004000,
        exported: false,
      },
    };

    const out = exportBlock('/exp', exportStatus);
    // Labels and keys present
    expect(out).toContain('E=export-errors');
    expect(out).toContain('W=export-warns');
    expect(out).toContain('I=export-info');
    expect(out).toContain('A=export-all');
    expect(out).toContain('F=export-failures-csv');

    // “open” hyperlinks generated via osc8Link for absolute paths
    expect(H.osc8Spy).toHaveBeenCalled();
    expect(out).toContain('[OSC8:open]');

    // Absolute paths and file:// URLs appear
    const { href } = pathToFileURL('/exp/combined-errors.log');
    expect(out).toContain('/exp/combined-errors.log');
    expect(out).toContain(href);
  });

  it('exportBlock: when exportsDir is undefined and no status path, shows placeholder and does not call osc8Link', () => {
    const exportStatus = {
      error: undefined,
      warn: undefined,
      info: undefined,
      all: undefined,
      failuresCsv: undefined,
    } as unknown as Record<string, unknown>;
    const out = exportBlock(undefined, exportStatus);
    expect(out).toContain('(set exportsDir)');
    expect(H.osc8Spy).not.toHaveBeenCalled();
  });
});
