import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getWorkerLogPaths, spawnWorkerProcess } from '../spawnWorkerProcess';
import { fork } from 'node:child_process';
import { createWriteStream, type WriteStream } from 'node:fs';
import { ensureLogFile } from '../ensureLogFile';
import { openLogTailWindowMulti } from '../openTerminal';

/**
 * Mock deps before SUT import (inline factories).
 */
vi.mock('node:child_process', () => ({
  fork: vi.fn(),
}));
vi.mock('node:fs', () => ({
  createWriteStream: vi.fn(),
}));
vi.mock('../openTerminal', () => ({
  openLogTailWindowMulti: vi.fn(),
}));
vi.mock('../ensureLogFile', () => ({
  ensureLogFile: vi.fn(),
}));
vi.mock('../logRotation', () => {
  const makeLineSplitter = vi.fn(
    (cb: (line: string) => void) => (chunk: unknown) => cb(String(chunk)),
  );
  return {
    classifyLogLevel: vi.fn(),
    makeLineSplitter,
  };
});

const mFork = vi.mocked(fork);
const mCws = vi.mocked(createWriteStream);
const mEnsure = vi.mocked(ensureLogFile);
const mOpen = vi.mocked(openLogTailWindowMulti);

/**
 * Create a fake child process with readable-like stdout/stderr.
 *
 * @returns fake ChildProcess with stdout/stderr minimal interfaces
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChild(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};
  const mkReadable = (): {
    /** Pipe method to simulate readable stream */
    pipe: () => undefined;
    /** Event listener method */
    on: (evt: string, cb: (...args: unknown[]) => void) => void;
  } => ({
    pipe: vi.fn(() => undefined),
    on: vi.fn((evt: string, cb: (...a: unknown[]) => void) => {
      listeners[evt] ||= [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listeners[evt].push(cb as any);
    }),
  });
  return {
    pid: 1234,
    connected: true,
    channel: { destroyed: false },
    stdout: mkReadable(),
    stderr: mkReadable(),
  };
}

/**
 * Make a writable sink that records content written to it.
 *
 * @returns writable-like with write/on
 */
function sink(): WriteStream {
  let buf = '';
  return {
    write: vi.fn((s: string) => {
      buf += s;
    }),
    on: vi.fn(),
    /**
     * Read the content written so far.
     *
     * @returns the accumulated string content
     */
    get content() {
      return buf;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('getWorkerLogPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // each createWriteStream returns a fresh sink
    mCws.mockImplementation(() => sink());
  });

  it('returns undefined when no paths are stashed', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dummy: any = {};
    expect(getWorkerLogPaths(dummy)).toBeUndefined();
  });

  it('returns paths set by spawnWorkerProcess', () => {
    const child = makeChild();
    mFork.mockReturnValue(child as never);

    const out = spawnWorkerProcess({
      id: 7,
      modulePath: '/mod.js',
      logDir: '/logs',
      openLogWindows: false,
      isSilent: true,
    });

    // ensure files created
    expect(mEnsure).toHaveBeenCalledTimes(6);
    expect(out).toBe(child);

    const paths = getWorkerLogPaths(out);
    expect(paths).toEqual({
      structuredPath: '/logs/worker-7.log',
      outPath: '/logs/worker-7.out.log',
      errPath: '/logs/worker-7.err.log',
      infoPath: '/logs/worker-7.info.log',
      warnPath: '/logs/worker-7.warn.log',
      errorPath: '/logs/worker-7.error.log',
    });

    expect(mOpen).not.toHaveBeenCalled(); // openLogWindows=false
  });
});
