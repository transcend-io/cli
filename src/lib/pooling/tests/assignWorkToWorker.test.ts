// assignWorkToWorker.test.ts
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import type { ChildProcess } from 'node:child_process';

import { assignWorkToWorker, type WorkerState } from '../assignWorkToWorker';
import { isIpcOpen } from '../spawnWorkerProcess';

// Mock FIRST, using the path relative to THIS test file
vi.mock('../spawnWorkerProcess', () => ({
  isIpcOpen: vi.fn(),
}));

const mockedIsIpcOpen = vi.mocked(isIpcOpen);

describe('assignWorkToWorker', () => {
  const NOW = 1_700_000_000_000;
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  /**
   * Creates maps for workers and workerState, with optional previous state and send implementation.
   *
   * @param workerId - ID of the worker to create
   * @param opts - Optional parameters:
   * @returns An object containing:
   */
  function makeMaps(
    // eslint-disable-next-line default-param-last
    workerId = 1,
    opts?: {
      /** Worker previous state */
      prevState?: WorkerState;
      /** Function to mock the send method */
      sendImpl?: (msg: unknown) => unknown;
    },
  ): {
    /** Worker processes map */
    workers: Map<number, ChildProcess>;
    /** Worker state map   */
    workerState: Map<number, WorkerState>;
    /** Repaint function */
    repaint: Mock;
    /** Send function */
    send: Mock;
  } {
    const workers = new Map<number, ChildProcess>();
    const workerState = new Map<number, WorkerState>();
    const repaint = vi.fn();

    const send = vi.fn(opts?.sendImpl ?? (() => true));
    const fakeProc = { send } as unknown as ChildProcess;

    workers.set(workerId, fakeProc);
    if (opts?.prevState) workerState.set(workerId, opts.prevState);

    return { workers, workerState, repaint, send };
  }

  it('marks worker idle and preserves lastLevel when IPC is closed (no repaint, no send)', () => {
    mockedIsIpcOpen.mockReturnValue(false);

    const pending = ['a.csv'];
    const { workers, workerState, repaint, send } = makeMaps(1, {
      prevState: {
        busy: true,
        file: '/tmp/old.csv',
        startedAt: 42,
        lastLevel: 'warn',
        progress: { processed: 1, total: 10 },
      },
    });

    assignWorkToWorker(
      1,
      { some: 'payload' },
      { pending, workers, workerState, repaint },
    );

    expect(workerState.get(1)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'warn',
      progress: undefined,
    });
    expect(repaint).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(pending).toEqual(['a.csv']);
  });

  it('idles and repaints when no pending work (IPC open), preserving lastLevel', () => {
    mockedIsIpcOpen.mockReturnValue(true);

    const pending: string[] = [];
    const { workers, workerState, repaint, send } = makeMaps(1, {
      prevState: {
        busy: true,
        file: '/tmp/old.csv',
        startedAt: 10,
        lastLevel: 'error',
      } as WorkerState,
    });

    assignWorkToWorker(
      1,
      { foo: 'bar' },
      { pending, workers, workerState, repaint },
    );

    expect(workerState.get(1)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'error',
      progress: undefined,
    });
    expect(repaint).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('assigns next file, repaints once, and sends task when IPC open and work pending', () => {
    mockedIsIpcOpen.mockReturnValue(true);

    const pending = ['/data/f1.csv', '/data/f2.csv'];
    const payload = { skipWorkflowTriggers: true };

    const { workers, workerState, repaint, send } = makeMaps();

    assignWorkToWorker(1, payload, { pending, workers, workerState, repaint });

    expect(workerState.get(1)).toMatchObject({
      busy: true,
      file: '/data/f1.csv',
      startedAt: NOW,
      lastLevel: 'ok',
      progress: undefined,
    });
    expect(pending).toEqual(['/data/f2.csv']);
    expect(repaint).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      type: 'task',
      payload: { filePath: '/data/f1.csv', options: payload },
    });
  });

  it.each([
    {
      label: 'ERR_IPC_CHANNEL_CLOSED',
      err: Object.assign(new Error('closed'), {
        code: 'ERR_IPC_CHANNEL_CLOSED',
      }),
    },
    {
      label: 'EPIPE',
      err: Object.assign(new Error('broken'), { code: 'EPIPE' }),
    },
    {
      label: 'errno -32',
      err: Object.assign(new Error('broken'), { errno: -32 }),
    },
  ])(
    'requeues and idles if send fails with recoverable error (%s)',
    ({ err }) => {
      mockedIsIpcOpen.mockReturnValue(true);

      const pending = ['/data/f1.csv', '/data/f2.csv'];
      const { workers, workerState, repaint, send } = makeMaps(1, {
        prevState: {
          busy: false,
          file: null,
          startedAt: null,
          lastLevel: 'warn',
        } as WorkerState,
        sendImpl: () => {
          throw err;
        },
      });

      assignWorkToWorker(
        1,
        { any: 'opts' },
        { pending, workers, workerState, repaint },
      );

      expect(pending).toEqual(['/data/f1.csv', '/data/f2.csv']); // requeued to front
      expect(workerState.get(1)).toEqual({
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: 'warn',
        progress: undefined,
      });
      expect(repaint).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenCalledTimes(1);
    },
  );

  it('throws unknown send errors (does not requeue)', () => {
    mockedIsIpcOpen.mockReturnValue(true);

    const pending = ['/data/f1.csv', '/data/f2.csv'];
    const unknownErr = new Error('kaboom');
    const { workers, workerState, repaint, send } = makeMaps(1, {
      sendImpl: () => {
        throw unknownErr;
      },
    });

    expect(() =>
      assignWorkToWorker(1, {}, { pending, workers, workerState, repaint }),
    ).toThrow(unknownErr);

    expect(pending).toEqual(['/data/f2.csv']); // consumed, not requeued
    expect(workerState.get(1)).toMatchObject({
      busy: true,
      file: '/data/f1.csv',
      startedAt: NOW,
      lastLevel: 'ok',
    });
    expect(repaint).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
