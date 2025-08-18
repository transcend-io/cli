import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommonCtx } from '../dashboardPlugin';

import {
  fmtNum,
  pctBar,
  poolProgress,
  makeHeader,
  makeWorkerRows,
} from '../uiPlugins';
import type { SlotState } from '../types';
import type { ObjByString } from '@transcend-io/type-utils';

/**
 * Mock colors so we don't get ANSI escapes in snapshots/expectations.
 */
vi.mock('colors', () => ({
  default: {
    bold: (s: string) => s,
    dim: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    cyan: (s: string) => s,
  },
}));

/**
 * Test slot type for our tests.
 */
type TestSlot = Partial<SlotState<ObjByString>>;

/**
 * Build a CommonCtx the helpers expect, with sane defaults.
 *
 * @param partial - Partial overrides.
 * @returns a test context
 */
function ctx(
  partial: Omit<Partial<CommonCtx<unknown, TestSlot>>, 'workerState'> & {
    /** Worker state map */
    workerState?: Map<number, TestSlot>;
  } = {},
): CommonCtx<unknown, TestSlot> {
  return {
    title: 'Chunk CSV',
    poolSize: 4,
    cpuCount: 8,
    filesTotal: 10,
    filesCompleted: 0,
    filesFailed: 0,
    workerState: new Map<number, TestSlot>(),
    throughput: undefined,
    ...partial,
    // ensure startedAt comparisons work if caller forgot to fake timers
    // (we still fake timers in tests that need elapsed output)
  } as CommonCtx<unknown, TestSlot>;
}

describe('fmtNum', () => {
  it('formats numbers with locale and returns "0" for undefined', () => {
    expect(fmtNum(0)).toBe('0');
    expect(fmtNum(1234)).toBe((1_234).toLocaleString());
    expect(fmtNum(undefined)).toBe('0');
  });
});

describe('pctBar', () => {
  it('generates a bar clamped between 0 and 100 with default width', () => {
    expect(pctBar(-10)).toBe('░'.repeat(40));
    expect(pctBar(0)).toBe('░'.repeat(40));
    expect(pctBar(50)).toBe('█'.repeat(20) + '░'.repeat(20));
    expect(pctBar(100)).toBe('█'.repeat(40));
    expect(pctBar(130)).toBe('█'.repeat(40));
  });

  it('honors custom width', () => {
    expect(pctBar(25, 8)).toBe('█'.repeat(2) + '░'.repeat(6));
    expect(pctBar(75, 8)).toBe('█'.repeat(6) + '░'.repeat(2));
  });
});

describe('poolProgress', () => {
  it('computes done, inProgress, and percentage', () => {
    const workerState = new Map<number, TestSlot>([
      [0, { busy: true }],
      [1, { busy: false }],
      [2, { busy: true }],
    ]);

    const c = ctx({
      workerState,
      filesTotal: 10,
      filesCompleted: 3,
      filesFailed: 1,
    });

    const { done, inProgress, pct } = poolProgress(c);
    expect(done).toBe(4);
    expect(inProgress).toBe(2);
    expect(pct).toBe(40);
  });

  it('returns 100% when filesTotal is 0 (nothing to do)', () => {
    const c = ctx({
      workerState: new Map(),
      filesTotal: 0,
      filesCompleted: 0,
      filesFailed: 0,
    });
    expect(poolProgress(c).pct).toBe(100);
  });
});

describe('makeHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('composes the basic header without throughput', () => {
    const workerState = new Map<number, TestSlot>([[0, { busy: true }]]);
    const c = ctx({
      title: 'My Task',
      poolSize: 2,
      cpuCount: 4,
      filesTotal: 5,
      filesCompleted: 2,
      filesFailed: 1,
      workerState,
    });

    const lines = makeHeader(c);
    // Title line
    expect(lines[0]).toContain('My Task');
    expect(lines[0]).toContain('2 workers');
    expect(lines[0]).toContain('(CPU avail: 4)');
    // Stats line
    expect(lines[1]).toContain('Files 5');
    expect(lines[1]).toContain('Completed 2');
    expect(lines[1]).toContain('Failed 1');
    expect(lines[1]).toContain('In-flight 1');
    // Bar + pct
    expect(lines[2]).toMatch(/^\[[█░]{40}\] \d+%$/);
  });

  it('adds throughput line including successSoFar suffix when provided', () => {
    const c = ctx({
      throughput: { r10s: 0.5, r60s: 0.25, successSoFar: 1234 },
    });

    const lines = makeHeader(c);
    expect(lines.length).toBe(4);
    expect(lines[3]).toContain('Throughput:');
    expect(lines[3]).toContain(`${Math.round(0.5 * 3600).toLocaleString()}/hr`);
    expect(lines[3]).toContain(
      `1h: ${Math.round(0.25 * 3600).toLocaleString()}/hr`,
    );
    expect(lines[3]).toContain('Newly uploaded: 1,234');
  });
});

describe('makeWorkerRows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:10:00Z')); // fixed "now"
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders rows with badges, file labels, elapsed, and mini bars', () => {
    const started50sAgo = new Date('2025-01-01T00:09:10Z').getTime();

    const workerState = new Map<number, TestSlot>([
      // idle slot
      [0, { busy: false, file: null }],
      // working with warn, half done
      [
        1,
        {
          busy: true,
          lastLevel: 'warn',
          file: '/abs/path/to/file.csv',
          startedAt: started50sAgo,
          progress: { processed: 50_000, total: 100_000 },
        },
      ],
      // error slot with progress
      [
        2,
        {
          busy: false,
          lastLevel: 'error',
          file: '/root/data/a.csv',
          startedAt: started50sAgo,
          progress: { processed: 30, total: 60 },
        },
      ],
    ]);

    const c = ctx({ workerState });

    // Default labeler uses basename(file)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = makeWorkerRows(c as any);
    expect(rows).toHaveLength(3);

    // [w0] IDLE
    expect(rows[0]).toContain('[w0]');
    expect(rows[0]).toContain('IDLE');
    // No total => mini bar is blank spaces of width 18, text is "—"
    expect(rows[0]).toMatch(/\[\s{18}\]/); // the blank mini-bar
    expect(rows[0]).toContain('—');

    // [w1] WARN + WORKING (warn wins in code order)
    expect(rows[1]).toContain('[w1]');
    expect(rows[1]).toContain('WARN'); // badge
    expect(rows[1]).toContain('file.csv'); // basename
    expect(rows[1]).toContain('50s'); // elapsed
    // 50% mini bar with width 18 -> 9 filled blocks
    expect(rows[1]).toContain(`[${'█'.repeat(9)}${'░'.repeat(9)}]`);
    expect(rows[1]).toContain('50,000/100,000 (50%)');

    // [w2] ERROR
    expect(rows[2]).toContain('[w2]');
    expect(rows[2]).toContain('ERROR');
    expect(rows[2]).toContain('a.csv');
    // 30/60 = 50% -> same mini bar as above
    expect(rows[2]).toContain(`[${'█'.repeat(9)}${'░'.repeat(9)}]`);
    expect(rows[2]).toContain('30/60 (50%)');
  });

  it('supports a custom file labeler', () => {
    const workerState = new Map<number, TestSlot>([
      [
        0,
        {
          busy: true,
          file: '/tmp/x.csv',
          progress: { processed: 1, total: 2 },
        },
      ],
    ]);
    const c = ctx({ workerState });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = makeWorkerRows(c as any, (f) => (f ? `LABEL:${f}` : 'NONE'));

    expect(rows[0]).toContain('LABEL:/tmp/x.csv');
  });
});
