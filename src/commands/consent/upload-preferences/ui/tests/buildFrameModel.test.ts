// src/commands/consent/upload-preferences/ui/__tests__/frameModel.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  buildFrameModel,
  isUploadModeTotals,
  isCheckModeTotals,
  type UploadModeTotals,
  type CheckModeTotals,
  type RenderDashboardInput,
} from '../buildFrameModel';
import type { WorkerState } from '../../../../../lib/pooling';

/* -----------------------------------------------------------------------------
  Local test-only types & helpers
----------------------------------------------------------------------------- */

/**
 * Minimal shape used by buildFrameModel at runtime for a worker.
 * We keep it local to avoid importing runtime-only types from external modules.
 */
type TWorkerState = {
  /** Whether the worker is currently processing */
  busy: boolean;
  /** Optional progress data */
  progress?: {
    /** Total planned records for the current file */
    total?: number;
    /** Cumulative successes for the current file (not required by SUT) */
    successTotal?: number;
    /** File total (not required by SUT) */
    fileTotal?: number;
  };
};

/**
 * Build a Map of worker states keyed by worker id.
 *
 * @param entries - Worker id to state tuples
 * @returns A Map of worker states
 */
function workerMap(
  entries: Array<[number, TWorkerState]>,
): Map<number, WorkerState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Map<number, WorkerState>(entries as any);
}

/**
 * Construct a baseline RenderDashboardInput with overridable fields.
 *
 * @param overrides - Partial overrides
 * @returns A RenderDashboardInput
 */
function makeInput(
  overrides: Partial<RenderDashboardInput> = {},
): RenderDashboardInput {
  return {
    poolSize: 4,
    cpuCount: 8,
    filesTotal: 0,
    filesCompleted: 0,
    filesFailed: 0,
    // Cast to the SUT's expected Map<number, WorkerState> to avoid leaking test-only types
    workerState: workerMap([]),
    ...overrides,
  } as RenderDashboardInput;
}

/* -----------------------------------------------------------------------------
  Type guards
----------------------------------------------------------------------------- */

describe('type guards', () => {
  it('isUploadModeTotals returns true only for upload mode', () => {
    const good: UploadModeTotals = {
      mode: 'upload',
      success: 1,
      skipped: 2,
      error: 3,
      errors: {},
    };
    expect(isUploadModeTotals(good)).toBe(true);

    const badMode: unknown = { mode: 'check' };
    expect(isUploadModeTotals(badMode)).toBe(false);

    expect(isUploadModeTotals(null)).toBe(false);
    expect(isUploadModeTotals(undefined)).toBe(false);
    expect(isUploadModeTotals({})).toBe(false);
  });

  it('isCheckModeTotals returns true only for check mode', () => {
    const good: CheckModeTotals = {
      mode: 'check',
      pendingConflicts: 1,
      pendingSafe: 2,
      totalPending: 3,
      skipped: 4,
    };
    expect(isCheckModeTotals(good)).toBe(true);

    const badMode: unknown = { mode: 'upload' };
    expect(isCheckModeTotals(badMode)).toBe(false);

    expect(isCheckModeTotals(null)).toBe(false);
    expect(isCheckModeTotals(undefined)).toBe(false);
    expect(isCheckModeTotals({})).toBe(false);
  });
});

/* -----------------------------------------------------------------------------
  buildFrameModel — core stats
----------------------------------------------------------------------------- */

describe('buildFrameModel — core stats', () => {
  it('computes inProgress, completedFiles, pct (normal case)', () => {
    const wm = workerMap([
      [1, { busy: true, progress: { total: 20 } }],
      [2, { busy: false }],
      [3, { busy: true, progress: { total: 5 } }],
    ]);

    const input: RenderDashboardInput = makeInput({
      filesTotal: 10,
      filesCompleted: 3,
      filesFailed: 2,
      workerState: wm as Map<number, WorkerState>,
    });

    const fm = buildFrameModel(input);

    expect(fm.inProgress).toBe(2);
    expect(fm.completedFiles).toBe(5);
    expect(fm.pct).toBe(50);
  });

  it('pct is 100 when filesTotal is 0 (avoid div by zero)', () => {
    const input: RenderDashboardInput = makeInput({
      filesTotal: 0,
      filesCompleted: 0,
      filesFailed: 0,
      workerState: workerMap([]) as Map<number, WorkerState>,
    });

    const fm = buildFrameModel(input);
    expect(fm.pct).toBe(100);
  });
});

/* -----------------------------------------------------------------------------
  buildFrameModel — estTotalJobs with receipts path
----------------------------------------------------------------------------- */

describe('buildFrameModel — estTotalJobs (receipts-based)', () => {
  it('uses receipts + inflight + remainingFiles * avg-per-completed', () => {
    // jobsFromReceipts = 115
    const totals: UploadModeTotals = {
      mode: 'upload',
      success: 100,
      skipped: 10,
      error: 5,
      errors: {},
    };

    // completedFiles = 3 + 2 = 5
    // inProgress = 2, inflightJobsKnown = 20 + 30 = 50
    // remainingFiles = 10 - 5 - 2 = 3
    // avgJobsPerCompletedFile = 115 / 5 = 23
    // estTotalJobs = 115 + 50 + (3 * 23) = 234
    const wm = workerMap([
      [1, { busy: true, progress: { total: 20 } }],
      [2, { busy: true, progress: { total: 30 } }],
      [3, { busy: false }],
    ]);

    const input: RenderDashboardInput = makeInput({
      filesTotal: 10,
      filesCompleted: 3,
      filesFailed: 2,
      workerState: wm,
      totals,
    });

    const fm = buildFrameModel(input);
    expect(fm.estTotalJobs).toBe(234);
  });
});

/* -----------------------------------------------------------------------------
  buildFrameModel — ETA string (minutes/seconds branch)
----------------------------------------------------------------------------- */

describe('buildFrameModel — ETA text', () => {
  let restoreTime: () => void;

  beforeEach((): void => {
    const fixed = new Date('2025-01-01T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(fixed);
    restoreTime = (): void => {
      vi.useRealTimers();
    };
  });

  afterEach((): void => {
    restoreTime();
  });

  it('formats ETA when r60s > 0 (prefers 60s rate) and remainingJobs > 0', () => {
    // From prior math: estTotalJobs = 234, jobsFromReceipts = 115 -> remainingJobs = 119
    // r60s = 1 job/sec -> 3600 jobs/hour -> ~119 seconds => "1m 59s"
    const totals: UploadModeTotals = {
      mode: 'upload',
      success: 100,
      skipped: 10,
      error: 5,
      errors: {},
    };

    const wm = workerMap([
      [1, { busy: true, progress: { total: 20 } }],
      [2, { busy: true, progress: { total: 30 } }],
      [3, { busy: false }],
    ]);

    const input: RenderDashboardInput = makeInput({
      filesTotal: 10,
      filesCompleted: 3,
      filesFailed: 2,
      workerState: wm,
      totals,
      throughput: { successSoFar: 9999, r10s: 0.5, r60s: 1 },
    });

    const fm = buildFrameModel(input);

    expect(fm.estTotalJobs).toBe(234);
    expect(fm.etaText).toMatch(/^Expected completion: .+ \(1m 59s left\)$/);
  });

  it('omits ETA when throughput is missing or remaining is zero', () => {
    const totals: UploadModeTotals = {
      mode: 'upload',
      success: 10,
      skipped: 0,
      error: 0,
      errors: {},
    };

    const inputNoThroughput: RenderDashboardInput = makeInput({
      filesTotal: 1,
      filesCompleted: 0,
      filesFailed: 0,
      workerState: workerMap([[1, { busy: true, progress: { total: 10 } }]]),
      totals,
    });

    const fm1 = buildFrameModel(inputNoThroughput);
    expect(fm1.etaText).toBe('');

    const inputZeroRemaining: RenderDashboardInput = makeInput({
      filesTotal: 1,
      filesCompleted: 1,
      filesFailed: 0,
      workerState: workerMap([]),
      totals,
      throughput: { successSoFar: 10, r10s: 1, r60s: 1 },
    });

    const fm2 = buildFrameModel(inputZeroRemaining);
    expect(fm2.etaText).toBe('');
  });
});

/* -----------------------------------------------------------------------------
  buildFrameModel — estTotalJobs without receipts (in-flight only path)
----------------------------------------------------------------------------- */

describe('buildFrameModel — estTotalJobs (in-flight path, no receipts)', () => {
  it('falls back to in-flight average when no receipts are available', () => {
    // inProgress = 2, inflightKnown = 12 + 38 = 50
    // remainingFiles = 7 - (2 completed + 1 failed) - 2 inProgress = 2
    // avgInFlight = 50 / 2 = 25
    // est = 50 + 2 * 25 = 100
    const wm = workerMap([
      [1, { busy: true, progress: { total: 12 } }],
      [2, { busy: true, progress: { total: 38 } }],
      [3, { busy: false }],
    ]);

    const input: RenderDashboardInput = makeInput({
      filesTotal: 7,
      filesCompleted: 2,
      filesFailed: 1,
      workerState: wm,
      totals: undefined,
      throughput: { successSoFar: 0, r10s: 0.8, r60s: 0 },
    });

    const fm = buildFrameModel(input);
    expect(fm.estTotalJobs).toBe(100);
  });
});
