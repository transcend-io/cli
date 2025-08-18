import { describe, it, expect, vi } from 'vitest';
import type { ChildProcess } from 'node:child_process';

import { safeGetLogPathsForSlot } from '../safeGetLogPathsForSlot';
import {
  isIpcOpen,
  getWorkerLogPaths,
  type WorkerLogPaths,
} from '../spawnWorkerProcess';

/**
 * Mock collaborators BEFORE importing the SUT.
 * Inline factory avoids Vitest hoisting pitfalls.
 *
 * IMPORTANT: The mock path MUST match the specifier used by the SUT after resolution.
 * Since the SUT imports from './spawnWorkerProcess', and this test lives in ../tests,
 * the correct mock specifier here is '../spawnWorkerProcess'.
 */
vi.mock('../spawnWorkerProcess', () => ({
  isIpcOpen: vi.fn(),
  getWorkerLogPaths: vi.fn(),
}));

const mockedIsOpen = vi.mocked(isIpcOpen);
const mockedGetPaths = vi.mocked(getWorkerLogPaths);

/**
 * Make a minimal ChildProcess (we only need an object identity).
 *
 * @returns a fake child process instance
 */
function makeChild(): ChildProcess {
  return {} as unknown as ChildProcess;
}

/**
 * Build workers and fallback slotLogPaths maps for tests.
 *
 * @param id - worker id to insert
 * @param fallback - optional fallback paths to prefill in slotLogPaths
 * @returns
 *
 *
 *  pair of maps to use in a test
 */
function makeMaps(
  id: number,
  fallback?: WorkerLogPaths,
): {
  /** Map of worker IDs to their ChildProcess instances */
  workers: Map<number, ChildProcess>;
  /** Map of worker IDs to their log paths */
  slotLogPaths: Map<number, WorkerLogPaths | undefined>;
} {
  const workers = new Map<number, ChildProcess>();
  workers.set(id, makeChild());
  const slotLogPaths = new Map<number, WorkerLogPaths | undefined>();
  slotLogPaths.set(id, fallback);
  return { workers, slotLogPaths };
}

describe('safeGetLogPathsForSlot', () => {
  it('returns live log paths when IPC is open and getWorkerLogPaths returns a value', () => {
    mockedIsOpen.mockReturnValue(true);

    // A concrete "live" value to return from getWorkerLogPaths
    const live: WorkerLogPaths = {
      // minimal-but-typed dummy payload for the test
      outPath: '/live/out.log',
      errPath: '/live/err.log',
      infoPath: undefined,
      warnPath: undefined,
      errorPath: undefined,
      structuredPath: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockedGetPaths.mockReturnValue(live);

    const { workers, slotLogPaths } = makeMaps(1, {
      outPath: '/fallback/out.log',
      errPath: '/fallback/err.log',
      infoPath: undefined,
      warnPath: undefined,
      errorPath: undefined,
      structuredPath: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = safeGetLogPathsForSlot(1, workers, slotLogPaths);
    expect(res).toBe(live);
  });

  it('falls back to slotLogPaths when IPC is open but getWorkerLogPaths returns undefined', () => {
    mockedIsOpen.mockReturnValue(true);
    mockedGetPaths.mockReturnValue(undefined);

    const fallback: WorkerLogPaths = {
      outPath: '/fallback/out.log',
      errPath: '/fallback/err.log',
      infoPath: '/fallback/info.log',
      warnPath: undefined,
      errorPath: undefined,
      structuredPath: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { workers, slotLogPaths } = makeMaps(2, fallback);
    const res = safeGetLogPathsForSlot(2, workers, slotLogPaths);
    expect(res).toBe(fallback);
  });

  it('falls back to slotLogPaths when IPC is open but getWorkerLogPaths returns null', () => {
    mockedIsOpen.mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedGetPaths.mockReturnValue(null as any);

    const fallback: WorkerLogPaths = {
      outPath: '/fallback/out.log',
      errPath: '/fallback/err.log',
      infoPath: undefined,
      warnPath: '/fallback/warn.log',
      errorPath: undefined,
      structuredPath: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { workers, slotLogPaths } = makeMaps(3, fallback);
    const res = safeGetLogPathsForSlot(3, workers, slotLogPaths);
    expect(res).toBe(fallback);
  });

  it('falls back to slotLogPaths when getWorkerLogPaths throws', () => {
    mockedIsOpen.mockReturnValue(true);
    mockedGetPaths.mockImplementation(() => {
      throw new Error('boom');
    });

    const fallback: WorkerLogPaths = {
      outPath: '/fb/out.log',
      errPath: '/fb/err.log',
      infoPath: undefined,
      warnPath: undefined,
      errorPath: '/fb/error.log',
      structuredPath: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { workers, slotLogPaths } = makeMaps(4, fallback);
    const res = safeGetLogPathsForSlot(4, workers, slotLogPaths);
    expect(res).toBe(fallback);
  });

  it('returns fallback for missing/closed worker (isIpcOpen false)', () => {
    mockedIsOpen.mockReturnValue(false);

    const fallback: WorkerLogPaths = {
      outPath: '/closed/out.log',
      errPath: '/closed/err.log',
      infoPath: undefined,
      warnPath: undefined,
      errorPath: undefined,
      structuredPath: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { workers, slotLogPaths } = makeMaps(5, fallback);
    // Simulate missing worker
    workers.delete(5);

    const res = safeGetLogPathsForSlot(5, workers, slotLogPaths);
    expect(res).toBe(fallback);
  });

  it('returns undefined when neither live nor fallback are available', () => {
    mockedIsOpen.mockReturnValue(false);

    const workers = new Map<number, ChildProcess>();
    const slotLogPaths = new Map<number, WorkerLogPaths | undefined>();
    // no worker, no fallback
    const res = safeGetLogPathsForSlot(42, workers, slotLogPaths);
    expect(res).toBeUndefined();
  });
});
