import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

import { assignWorkToSlot, type WorkerMaps } from '../workerAssignment';
import { isIpcOpen, safeSend } from '../spawnWorkerProcess';

/**
 * Mock collaborators BEFORE importing the SUT.
 * Use an inline factory to avoid Vitest hoisting pitfalls.
 *
 * IMPORTANT: The mock path MUST match the specifier used by the SUT after resolution.
 * Since workerAssignment.ts imports from './spawnWorkerProcess', and this test lives
 * in ../tests, the correct mock specifier here is '../spawnWorkerProcess'.
 */
vi.mock('../spawnWorkerProcess', () => ({
  isIpcOpen: vi.fn(),
  safeSend: vi.fn(),
}));

const mockedIsOpen = vi.mocked(isIpcOpen);
const mockedSafeSend = vi.mocked(safeSend);

describe('assignWorkToSlot', () => {
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
   * Create minimal WorkerMaps with a single worker slot.
   *
   * @param id - worker id
   * @param prevLastLevel - lastLevel to pre-seed in workerState (useful to check preservation)
   * @returns initialized maps for testing
   */
  function makeMaps(
    id = 1,
    prevLastLevel: 'ok' | 'warn' | 'error' = 'warn',
  ): WorkerMaps {
    const workers = new Map<number, ChildProcess>();
    // minimal "child" — we only need a shape to put into the map
    const child = {} as unknown as ChildProcess;
    workers.set(id, child);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workerState = new Map<number, any>();
    workerState.set(id, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: prevLastLevel,
      progress: undefined,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slotLogPaths = new Map<number, any>();

    return {
      workers,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workerState: workerState as unknown as Map<number, any>,
      slotLogPaths,
    } as unknown as WorkerMaps;
  }

  it('marks idle and preserves lastLevel when IPC is closed (does not shift queue or send)', () => {
    mockedIsOpen.mockReturnValue(false);

    const filesQueue = ['a.csv'];
    const maps = makeMaps(1, 'warn');

    assignWorkToSlot(1, filesQueue, { opt: 1 }, maps);

    // lastLevel preserved from previous
    expect(maps.workerState.get(1)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'warn',
      progress: undefined,
    });

    // queue untouched, no send
    expect(filesQueue).toEqual(['a.csv']);
    expect(mockedSafeSend).not.toHaveBeenCalled();
  });

  it('idles when no files are pending (IPC open), preserving lastLevel', () => {
    mockedIsOpen.mockReturnValue(true);

    const filesQueue: string[] = [];
    const maps = makeMaps(1, 'error');

    assignWorkToSlot(1, filesQueue, {}, maps);

    expect(maps.workerState.get(1)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'error',
      progress: undefined,
    });
    expect(mockedSafeSend).not.toHaveBeenCalled();
  });

  it('assigns next file, sets busy with startedAt, and calls safeSend', () => {
    mockedIsOpen.mockReturnValue(true);
    mockedSafeSend.mockReturnValue(true);

    const filesQueue = ['/data/f1.csv', '/data/f2.csv'];
    const maps = makeMaps();

    const commonOpts = { skip: true };
    assignWorkToSlot(1, filesQueue, commonOpts, maps);

    // state set to busy with the first file
    expect(maps.workerState.get(1)).toMatchObject({
      busy: true,
      file: '/data/f1.csv',
      startedAt: NOW,
      lastLevel: 'ok',
      progress: undefined,
    });

    // consumed first item
    expect(filesQueue).toEqual(['/data/f2.csv']);

    // correct message sent via safeSend
    expect(mockedSafeSend).toHaveBeenCalledTimes(1);
    expect(mockedSafeSend).toHaveBeenCalledWith(expect.any(Object), {
      type: 'task',
      payload: { filePath: '/data/f1.csv', options: commonOpts },
    });
  });

  it('requeues and idles if safeSend returns false (IPC closed mid-send)', () => {
    mockedIsOpen.mockReturnValue(true);
    mockedSafeSend.mockReturnValue(false);

    const filesQueue = ['/data/one.csv', '/data/two.csv'];
    const maps = makeMaps(1, 'warn');

    assignWorkToSlot(1, filesQueue, { anything: true }, maps);

    // file requeued to the front (queue restored)
    expect(filesQueue).toEqual(['/data/one.csv', '/data/two.csv']);

    // worker ends idle; note: lastLevel becomes 'ok' because the busy state set it before failure
    expect(maps.workerState.get(1)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'ok',
      progress: undefined,
    });
  });

  it('handles missing worker like closed IPC (marks idle, preserves lastLevel)', () => {
    // isIpcOpen( undefined ) → false
    mockedIsOpen.mockReturnValue(false);

    const filesQueue = ['x.csv'];
    const maps = makeMaps(1, 'error');
    maps.workers.delete(1); // simulate missing worker

    assignWorkToSlot(1, filesQueue, {}, maps);

    expect(maps.workerState.get(1)).toEqual({
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'error',
      progress: undefined,
    });
    expect(filesQueue).toEqual(['x.csv']);
    expect(mockedSafeSend).not.toHaveBeenCalled();
  });
});
