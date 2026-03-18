import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

/* SUT */
import { runPool } from '../runPool';

/* colors → identity */
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

/* RateCounter → deterministic */
vi.mock('../../helpers', () => ({
  RateCounter: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    rate: vi.fn().mockReturnValue(0),
  })),
}));

/* spawnWorkerProcess + friends (IMPORTANT: path is ../ from this test) */
const mSafeSend = vi.fn();
const mIsIpcOpen = vi.fn().mockReturnValue(true);
const mGetWorkerLogPaths = vi.fn().mockReturnValue({
  out: '/tmp/out.log',
  err: '/tmp/err.log',
  structured: '/tmp/structured.log',
  current: '/tmp/current.log',
});
const mSpawnWorkerProcess = vi.fn();

vi.mock('../spawnWorkerProcess', () => ({
  safeSend: (...a: unknown[]) => mSafeSend(...a),
  isIpcOpen: (...a: unknown[]) => mIsIpcOpen(...a),
  getWorkerLogPaths: (...a: unknown[]) => mGetWorkerLogPaths(...a),
  spawnWorkerProcess: (...a: unknown[]) => mSpawnWorkerProcess(...a),
}));

/* logRotation bits the runner uses */
vi.mock('../logRotation', () => ({
  initLogDir: vi.fn(() => '/exp'), // avoid real FS
  makeLineSplitter: (fn: (line: string) => void) => (buf: unknown) =>
    fn(String(buf)),
  classifyLogLevel: (line: string) =>
    /ERROR/.test(line) ? 'error' : /WARN/.test(line) ? 'warn' : undefined,
}));

/* interactive switcher → cleanup fn */
const mInstallInteractiveSwitcher = vi.fn().mockReturnValue(() => {
  // noop
});
vi.mock('../installInteractiveSwitcher', () => ({
  installInteractiveSwitcher: (...a: unknown[]) =>
    mInstallInteractiveSwitcher(...a),
}));

/* safeGetLogPathsForSlot — simple stub */
vi.mock('../safeGetLogPathsForSlot', () => ({
  safeGetLogPathsForSlot: vi.fn(() => ({
    out: '/tmp/out.log',
    err: '/tmp/err.log',
    structured: '/tmp/structured.log',
    current: '/tmp/current.log',
  })),
}));

/* ─── Test utilities ─────────────────────────────────────────────────────── */

/** Fake child process used by the pool. */
class FakeChild extends EventEmitter {
  public stderr = new EventEmitter();

  public kill = vi.fn(() => true);
}

/** Task payload used for tests. */
type Task = {
  /** ID of task */
  id: number;
};
/** Progress payload used for tests. */
type Prog = {
  /** Progress */
  inc: number;
};
/** Result payload used for tests. */
type Res = {
  /** Delta */
  delta: number;
};
/** Totals object used for tests. */
type Totals = {
  /** Count */
  count: number;
};

/* Keep references to spawned children by slot id (no `any`). */
let spawned: Record<number, FakeChild> = {};

/* ─── Tests ──────────────────────────────────────────────────────────────── */

describe('runPool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mSafeSend.mockClear();
    mInstallInteractiveSwitcher.mockClear();
    mSpawnWorkerProcess.mockClear();
    spawned = {};

    /* Every spawn returns a new FakeChild and stores it in `spawned[id]`. */
    mSpawnWorkerProcess.mockImplementation(({ id }: Task) => {
      const child = new FakeChild();
      spawned[id] = child;
      return child as unknown as import('node:child_process').ChildProcess;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('assigns on READY, folds progress/results, shuts down, renders, and post-processes', async () => {
    const renders: Array<{
      /** Title */
      title: string;
      /** Count of successfully completed files/tasks. */
      filesCompleted: number;
      /** Count of failed files/tasks. */
      filesFailed: number;
      /** Final */
      final: boolean;
      /** Size of worker */
      workerStateSize: number;
      /** Totals */
      totals: Totals;
      /** Export status */
      exportStatus: unknown;
    }> = [];

    const hooks = {
      tasks: [{ id: 1 }] as Task[],
      /** @returns next task or undefined when drained */
      nextTask(): Task | undefined {
        return this.tasks.shift();
      },
      taskLabel: (t: Task) => `/abs/path/file-${t.id}.csv`,
      initTotals: () => ({ count: 0 } as Totals),
      initSlotProgress: (): Prog => ({ inc: 0 }),
      onProgress: (totals: Totals, p: Prog): Totals => ({
        count: totals.count + p.inc,
      }),
      onResult: (totals: Totals, r: Res) => ({
        totals: { count: totals.count + r.delta },
        ok: true,
      }),
      exportStatus: () => ({ some: 'status' }),
      postProcess: vi.fn(),
    };

    const p = runPool<Task, Prog, Res, Totals>({
      title: 'Parallel uploader',
      baseDir: '/work',
      childModulePath: '/mod/child.js',
      poolSize: 1,
      cpuCount: 8,
      filesTotal: 1,
      childFlag: '--as-child',
      hooks: hooks as unknown as import('../runPool').PoolHooks<
        Task,
        Prog,
        Res,
        Totals
      >,
      render: (snap) => {
        renders.push({
          title: snap.title,
          filesCompleted: snap.filesCompleted,
          filesFailed: snap.filesFailed,
          final: snap.final,
          workerStateSize: snap.workerState.size,
          totals: snap.totals,
          exportStatus: snap.exportStatus,
        });
      },
    });

    /* Drive the fake worker */
    const child = spawned[0];
    child.emit('message', { type: 'ready' });
    await vi.advanceTimersByTimeAsync(400);

    child.emit('message', {
      type: 'progress',
      payload: { inc: 2 } satisfies Prog,
    });
    child.stderr.emit('data', 'WARN something');
    child.emit('message', {
      type: 'result',
      payload: { delta: 3 } satisfies Res,
    });

    /* After result, pool should try to shutdown the child (no more tasks) */
    expect(mSafeSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'shutdown' }),
    );

    /* Exit the worker; the pool should finish. */
    child.emit('exit', 0);
    await vi.advanceTimersByTimeAsync(600);
    await p;

    /* Spawn called with our config and computed logDir */
    expect(mSpawnWorkerProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 0,
        modulePath: '/mod/child.js',
        logDir: '/exp',
        childFlag: '--as-child',
      }),
    );

    /* First task assignment happened */
    expect(mSafeSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'task', payload: { id: 1 } }),
    );

    /* Final renderer snapshot */
    const last = renders.at(-1)!;
    expect(last.final).toBe(true);
    expect(last.filesCompleted).toBe(1);
    expect(last.filesFailed).toBe(0);
    expect(last.totals).toEqual({ count: 5 }); // 2 (progress) + 3 (result)
    expect(last.exportStatus).toEqual({ some: 'status' });

    /* postProcess called with expected context */
    expect(hooks.postProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        logDir: '/exp',
        viewerMode: false,
        totals: { count: 5 },
        slots: expect.any(Map),
        logsBySlot: expect.any(Map),
        getLogPathsForSlot: expect.any(Function),
      }),
    );

    /* Interactive switcher installed (viewerMode default false) */
    expect(mInstallInteractiveSwitcher).toHaveBeenCalled();
  });

  it('viewerMode=true disables switcher and forces openLogWindows=false', async () => {
    const flags: boolean[] = [];

    const hooks = {
      tasks: [{ id: 1 }] as Task[],
      /** @returns next task or undefined */
      nextTask(): Task | undefined {
        return this.tasks.shift();
      },
      taskLabel: (t: Task) => `t-${t.id}`,
      onProgress: (t: Totals) => t,
      onResult: (t: Totals) => ({ totals: t, ok: true }),
      initTotals: () => ({ count: 0 } as Totals),
      postProcess: vi.fn(),
    };

    const prom = runPool<Task, Prog, Res, Totals>({
      title: 'Viewer',
      baseDir: '/work',
      childModulePath: '/mod/child.js',
      poolSize: 1,
      cpuCount: 4,
      filesTotal: 1,
      childFlag: '--as-child',
      hooks: hooks as unknown as import('../runPool').PoolHooks<
        Task,
        Prog,
        Res,
        Totals
      >,
      viewerMode: true,
      render: (snap) => flags.push(snap.final),
    });

    const child = spawned[0];
    child.emit('message', { type: 'ready' });
    await vi.advanceTimersByTimeAsync(50);
    child.emit('message', { type: 'result', payload: {} as Res });
    child.emit('exit', 0);
    await vi.advanceTimersByTimeAsync(400);
    await prom;

    /* viewerMode forces openLogWindows=false */
    expect(mSpawnWorkerProcess).toHaveBeenCalledWith(
      expect.objectContaining({ openLogWindows: false }),
    );
    /* No interactive switcher installed */
    expect(mInstallInteractiveSwitcher).not.toHaveBeenCalled();

    /* We still rendered a final frame */
    expect(flags.at(-1)).toBe(true);
  });
});
