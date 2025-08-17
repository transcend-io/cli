import { describe, it, expect, vi, beforeEach } from 'vitest';

import { spawnWorkerProcess } from '../spawnWorkerProcess';
import { fork } from 'node:child_process';
import { createWriteStream, type WriteStream } from 'node:fs';
import { ensureLogFile } from '../ensureLogFile';
import { openLogTailWindowMulti } from '../openTerminal';
import { classifyLogLevel } from '../logRotation';

/**
 * Inline mocks for all external deps used by the SUT.
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
const mClassify = vi.mocked(classifyLogLevel);

/**
 * Create a fake child with readable stdout/stderr that can capture handlers.
 *
 * @returns fake ChildProcess
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChild(): any {
  const listenersStdout: Array<(chunk: unknown) => void> = [];
  const listenersStderr: Array<(chunk: unknown) => void> = [];
  const mkReadable = (
    bag: Array<(chunk: unknown) => void>,
  ): {
    /** Pipe method to simulate readable stream */
    pipe: () => undefined;
    /** Event listener method */
    on: (evt: string, cb: (chunk: unknown) => void) => void;
    /** Emit a chunk to all listeners */
    _emit: (chunk: unknown) => void;
  } => ({
    pipe: vi.fn(() => undefined),
    on: vi.fn((evt: string, cb: (chunk: unknown) => void) => {
      if (evt === 'data') bag.push(cb);
    }),
    /**
     * Emit a chunk to all listeners.
     *
     * @param chunk - The data chunk to emit.
     */
    // eslint-disable-next-line no-underscore-dangle
    _emit(chunk: unknown) {
      bag.forEach((cb) => cb(chunk));
    },
  });
  return {
    pid: 4321,
    connected: true,
    channel: { destroyed: false },
    stdout: mkReadable(listenersStdout),
    stderr: mkReadable(listenersStderr),
  };
}

/**
 * Make a writable sink that records content written to it.
 *
 * @returns writable-like with write/on and content getter
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

describe('spawnWorkerProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mCws.mockImplementation(() => sink());
  });

  it('ensures log files, forks with proper args, writes headers, and opens tails when enabled', () => {
    const child = makeChild();
    mFork.mockReturnValue(child as never);

    const p = spawnWorkerProcess({
      id: 3,
      modulePath: '/worker.js',
      logDir: '/tmp/logs',
      openLogWindows: true,
      isSilent: false,
    });

    expect(p).toBe(child);
    // 6 files ensured
    expect(mEnsure).toHaveBeenCalledTimes(6);
    // fork args
    expect(mFork).toHaveBeenCalledWith(
      '/worker.js',
      ['--child-upload-preferences'],
      expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: expect.objectContaining({
          WORKER_ID: '3',
          WORKER_LOG: '/tmp/logs/worker-3.log',
        }),
        execArgv: expect.any(Array),
        silent: false,
      }),
    );

    // 5 write streams (out, err, info, warn, error) + structured file is not opened here (WORKER_LOG env)
    expect(mCws).toHaveBeenCalledTimes(5);

    // headers present in each stream buffer
    const streams = mCws.mock.results.map((r) => r.value) as unknown as Array<{
      /** Content */
      content: string;
    }>;
    streams.forEach((s) => {
      expect(s.content).toMatch(
        /\[parent] (stdout|stderr|info|warn|error) capture active for w3 \(pid 4321\)\n/,
      );
    });

    // openLogTailWindowMulti called with all six paths
    expect(mOpen).toHaveBeenCalledTimes(1);
    const [paths, name, isSilent] = mOpen.mock.calls[0]!;
    expect(paths).toEqual([
      '/tmp/logs/worker-3.log',
      '/tmp/logs/worker-3.out.log',
      '/tmp/logs/worker-3.err.log',
      '/tmp/logs/worker-3.info.log',
      '/tmp/logs/worker-3.warn.log',
      '/tmp/logs/worker-3.error.log',
    ]);
    expect(name).toBe('worker-3');
    expect(isSilent).toBe(false);
  });

  it('writes classified INFO/WARN/ERROR lines to their respective streams', () => {
    const child = makeChild();
    mFork.mockReturnValue(child as never);

    // Set classifier to route stderr chunks as error, then warn/untagged
    mClassify.mockReturnValueOnce('error'); // first stderr => error
    mClassify.mockReturnValueOnce(null); // second stderr => treated as warn

    spawnWorkerProcess({
      id: 1,
      modulePath: '/m.js',
      logDir: '/l',
      openLogWindows: false,
      isSilent: true,
    });

    // capture the created streams
    const created = mCws.mock.results.map((r) => r.value) as unknown as Array<{
      /** Write */
      write: (s: string) => void;
      /** Content */
      content: string;
    }>;
    const outStream = created[0]; // out
    const errStream = created[1]; // err
    const infoStream = created[2]; // info
    const warnStream = created[3]; // warn
    const errorStream = created[4]; // error

    // Emit a stdout line → goes to infoStream (classified) via splitter
    // eslint-disable-next-line no-underscore-dangle
    child.stdout._emit('hello-out');
    expect(infoStream.content).toMatch(/hello-out\n/);

    // Emit stderr lines → classify first as error, second as warn (null => warn)
    // eslint-disable-next-line no-underscore-dangle
    child.stderr._emit('boom!');
    // eslint-disable-next-line no-underscore-dangle
    child.stderr._emit('just-stderr');

    expect(errorStream.content).toMatch(/boom!\n/);
    expect(warnStream.content).toMatch(/just-stderr\n/);

    // Raw captures also got piped header (already asserted elsewhere), but we don’t assert piping body here.
    expect(outStream.content).toMatch(/\[parent] stdout capture active/);
    expect(errStream.content).toMatch(/\[parent] stderr capture active/);
  });
});
