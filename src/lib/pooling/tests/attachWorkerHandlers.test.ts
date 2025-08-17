/* eslint-disable max-lines */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { attachWorkerHandlers } from '../attachWorkerHandlers';
import { spawnWorkerProcess } from '../spawnWorkerProcess';
import { assignWorkToWorker } from '../assignWorkToWorker';
import {
  isWorkerReadyMessage,
  isWorkerProgressMessage,
  isWorkerResultMessage,
} from '../ipc';
import { wireStderrBadges, appendFailureLog } from '../diagnostics';

/**
 * IMPORTANT:
 * - We must mock all collaborators BEFORE importing the SUT.
 * - Mock paths are relative to THIS test file's location.
 */
vi.mock('../spawnWorkerProcess', () => ({
  spawnWorkerProcess: vi.fn(),
}));

vi.mock('../assignWorkToWorker', () => ({
  assignWorkToWorker: vi.fn(),
}));

vi.mock('../ipc', () => ({
  isWorkerReadyMessage: vi.fn(),
  isWorkerProgressMessage: vi.fn(),
  isWorkerResultMessage: vi.fn(),
}));

vi.mock('../diagnostics', () => ({
  wireStderrBadges: vi.fn(),
  appendFailureLog: vi.fn(),
}));

const mockedSpawn = vi.mocked(spawnWorkerProcess);
const mockedAssign = vi.mocked(assignWorkToWorker);
const mockedReady = vi.mocked(isWorkerReadyMessage);
const mockedProgress = vi.mocked(isWorkerProgressMessage);
const mockedResult = vi.mocked(isWorkerResultMessage);
const mockedWireBadges = vi.mocked(wireStderrBadges);
const mockedAppendFailure = vi.mocked(appendFailureLog);

/**
 * Create a minimal ChildProcess-like object using EventEmitter
 *
 * @returns Child process mock
 */
function makeChild(): ChildProcess {
  return new EventEmitter() as unknown as ChildProcess;
}

describe('attachWorkerHandlers', () => {
  const NOW = 1_700_000_000_000;
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('registers worker, initializes state (preserving lastLevel), and wires stderr badges', () => {
    const id = 1;
    const child = makeChild();

    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    // Simulate previous crash badge to verify preservation
    workerState.set(id, {
      busy: true,
      file: '/tmp/old.csv',
      startedAt: 123,
      lastLevel: 'warn',
      progress: { processed: 1, total: 10 },
    });

    const state = { completed: 0, failed: 0 };
    const filesPending: string[] = [];
    const repaint = vi.fn();
    const onAllWorkersExited = vi.fn();

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common: { any: 'opts' },
      onAllWorkersExited,
      logDir: '/logs',
      modulePath: '/worker.js',
      spawnSilent: false,
    });

    expect(workers.get(id)).toBe(child);
    expect(workerState.get(id)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'warn', // preserved from previous
      progress: undefined,
    });
    expect(mockedWireBadges).toHaveBeenCalledWith(
      id,
      child,
      workerState,
      repaint,
    );
  });

  it('on "ready": assigns work to the worker', () => {
    const id = 1;
    const child = makeChild();
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    const state = { completed: 0, failed: 0 };
    const filesPending = ['/f1.csv'];
    const repaint = vi.fn();

    const common = { payload: true };

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common,
      onAllWorkersExited: vi.fn(),
      logDir: '/logs',
      modulePath: '/worker.js',
    });

    mockedReady.mockReturnValue(true);
    mockedProgress.mockReturnValue(false);
    mockedResult.mockReturnValue(false);

    // Emit a message that passes the "ready" guard
    child.emit('message', { anything: true });

    expect(mockedAssign).toHaveBeenCalledWith(id, common, {
      pending: filesPending,
      workers,
      workerState,
      repaint,
    });
  });

  it('on "progress": updates per-worker progress, calls aggregator if successDelta, and repaints', () => {
    const id = 2;
    const child = makeChild();
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    const state = { completed: 0, failed: 0 };
    const filesPending: string[] = [];
    const repaint = vi.fn();
    const onProgress = vi.fn();

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common: {},
      onAllWorkersExited: vi.fn(),
      logDir: '/logs',
      modulePath: '/worker.js',
      onProgress,
    });

    mockedReady.mockReturnValue(false);
    mockedProgress.mockReturnValue(true);
    mockedResult.mockReturnValue(false);

    // First tick with deltas triggers aggregator
    child.emit('message', {
      payload: {
        filePath: '/data/fileA.csv',
        successDelta: 5,
        successTotal: 10,
        fileTotal: 100,
      },
    });

    expect(workerState.get(id)).toMatchObject({
      file: '/data/fileA.csv',
      progress: { processed: 10, total: 100 },
    });
    expect(onProgress).toHaveBeenCalledWith({
      workerId: id,
      filePath: '/data/fileA.csv',
      successDelta: 5,
      successTotal: 10,
      fileTotal: 100,
    });
    expect(repaint).toHaveBeenCalled();

    // Second tick without delta should NOT call aggregator
    onProgress.mockClear();
    child.emit('message', {
      payload: {
        filePath: '/data/fileA.csv',
        successDelta: 0,
        successTotal: 12,
        fileTotal: 100,
      },
    });
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('on "result" ok: increments completed, clears state with ok badge, repaints, and assigns next work', () => {
    const id = 3;
    const child = makeChild();
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    const state = { completed: 0, failed: 0 };
    const filesPending = ['/next.csv'];
    const repaint = vi.fn();

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common: { foo: 'bar' },
      onAllWorkersExited: vi.fn(),
      logDir: '/logs',
      modulePath: '/worker.js',
    });

    mockedReady.mockReturnValue(false);
    mockedProgress.mockReturnValue(false);
    mockedResult.mockReturnValue(true);

    child.emit('message', {
      payload: { ok: true, filePath: '/data/fileA.csv' },
    });

    expect(state.completed).toBe(1);
    expect(state.failed).toBe(0);

    expect(workerState.get(id)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'ok',
      progress: undefined,
    });

    expect(repaint).toHaveBeenCalled();
    expect(mockedAppendFailure).not.toHaveBeenCalled();

    expect(mockedAssign).toHaveBeenCalled(); // keep worker busy while queue non-empty
  });

  it('on "result" failure: increments failed, sets error badge, logs failure, repaints, and assigns next work', () => {
    const id = 4;
    const child = makeChild();
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    const state = { completed: 0, failed: 0 };
    const filesPending = ['/todo.csv'];
    const repaint = vi.fn();
    const logDir = '/logs';

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common: {},
      onAllWorkersExited: vi.fn(),
      logDir,
      modulePath: '/worker.js',
    });

    mockedReady.mockReturnValue(false);
    mockedProgress.mockReturnValue(false);
    mockedResult.mockReturnValue(true);

    child.emit('message', {
      payload: { ok: false, filePath: '/data/fileB.csv', error: 'boom' },
    });

    expect(state.completed).toBe(0);
    expect(state.failed).toBe(1);
    expect(workerState.get(id)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'error',
      progress: undefined,
    });
    expect(repaint).toHaveBeenCalled();
    expect(mockedAppendFailure).toHaveBeenCalledWith(
      logDir,
      id,
      '/data/fileB.csv',
      'boom',
    );
    expect(mockedAssign).toHaveBeenCalled();
  });

  it('ignores unknown messages (no guards match)', () => {
    const id = 5;
    const child = makeChild();
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    const state = { completed: 0, failed: 0 };
    const filesPending: string[] = [];
    const repaint = vi.fn();

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common: {},
      onAllWorkersExited: vi.fn(),
      logDir: '/logs',
      modulePath: '/worker.js',
    });

    mockedReady.mockReturnValue(false);
    mockedProgress.mockReturnValue(false);
    mockedResult.mockReturnValue(false);

    // Nothing should happen
    mockedAssign.mockClear();
    repaint.mockClear();

    child.emit('message', { unknown: true });

    expect(mockedAssign).not.toHaveBeenCalled();
    expect(repaint).not.toHaveBeenCalled();
  });

  it('on abnormal exit with pending work: respawns and re-attaches replacement', () => {
    const id = 6;
    const child = makeChild();
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    const state = { completed: 0, failed: 0 };
    const filesPending = ['/pending.csv']; // triggers respawn
    const repaint = vi.fn();

    const replacement = makeChild();
    mockedSpawn.mockReturnValue(replacement);

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common: { q: 1 },
      onAllWorkersExited: vi.fn(),
      logDir: '/logs',
      modulePath: '/worker.js',
      spawnSilent: true,
    });

    // Abnormal exit: non-zero code
    child.emit('exit', 1, null);

    expect(mockedSpawn).toHaveBeenCalledWith({
      id,
      modulePath: '/worker.js',
      logDir: '/logs',
      openLogWindows: true,
      isSilent: true,
    });

    // Replacement should be registered
    expect(workers.get(id)).toBe(replacement);
    // Badge should be set to error on the slot before respawn
    expect(repaint).toHaveBeenCalled();
  });

  it('on normal exit with no other workers: invokes onAllWorkersExited', () => {
    const id = 7;
    const child = makeChild();
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map();
    const state = { completed: 0, failed: 0 };
    const filesPending: string[] = []; // no respawn
    const repaint = vi.fn();
    const onAllWorkersExited = vi.fn();

    attachWorkerHandlers({
      id,
      child,
      workers,
      workerState,
      state,
      filesPending,
      repaint,
      common: {},
      onAllWorkersExited,
      logDir: '/logs',
      modulePath: '/worker.js',
    });

    // Normal exit: code 0, no signal
    child.emit('exit', 0, null);

    // Worker removed and since none remain, callback fired
    expect(workers.size).toBe(0);
    expect(onAllWorkersExited).toHaveBeenCalledTimes(1);
  });
});
/* eslint-enable max-lines */
