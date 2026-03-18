/* eslint-disable no-underscore-dangle,max-lines */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as readline from 'node:readline';
import { keymap } from '../keymap';
import { replayFileTailToStdout } from '../replayFileTailToStdout';
import { getWorkerIds, cycleWorkers } from '../workerIds';
import { installInteractiveSwitcher } from '../installInteractiveSwitcher';
import type { WorkerLogPaths } from '../spawnWorkerProcess';
import { EventEmitter } from 'node:events';

/**
 * Mocks must be hoist-safe: define spies inside factories.
 */
vi.mock('node:readline', () => ({
  emitKeypressEvents: vi.fn(),
}));
vi.mock('../keymap', () => ({
  keymap: vi.fn(),
}));
vi.mock('../replayFileTailToStdout', () => ({
  replayFileTailToStdout: vi.fn(
    (_p: string, _n: number, write: (s: string) => void) => {
      // simulate writing some bytes during replay
      write('[replayed]');
    },
  ),
}));
vi.mock('../workerIds', () => ({
  getWorkerIds: vi.fn(() => [1, 2]),
  cycleWorkers: vi.fn((_ids: number[], _cur: number | null, delta: number) =>
    delta >= 0 ? 1 : 2,
  ),
}));

/**
 * Small helper to yield the event loop so async handlers complete.
 *
 * @returns Promise that resolves on the next macrotask tick.
 */
async function tick(): Promise<void> {
  await new Promise<void>((r) => {
    setTimeout(r, 0);
  });
}

/**
 * Minimal fake TTY ports with spies for testing.
 *
 * @param tty - Whether stdin should behave like a TTY.
 * @returns Fake ports with spyable write/setRawMode and a manual `_emit` helper.
 */
function makePorts(tty = true): {
  /** Fake readable stdin with event helpers */
  stdin: NodeJS.ReadStream & {
    /** Manually emit events to any registered listeners */
    _emit: (evt: string, ...args: unknown[]) => void;
  };
  /** Fake stdout with a spyable write */
  stdout: NodeJS.WriteStream;
  /** Fake stderr with a spyable write */
  stderr: NodeJS.WriteStream;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = new Map<string, any[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const on = (evt: string, fn: any): void => {
    const arr = handlers.get(evt) ?? [];
    arr.push(fn);
    handlers.set(evt, arr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ports.stdin as any;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const off = (evt: string, fn: any): void => {
    const arr = handlers.get(evt) ?? [];
    const next = arr.filter((f) => f !== fn);
    handlers.set(evt, next);
  };
  const emit = (evt: string, ...args: unknown[]): void => {
    for (const fn of handlers.get(evt) ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fn as any)(...args);
    }
  };

  const ports = {
    stdin: {
      isTTY: tty,
      setRawMode: vi.fn(),
      on,
      off,
      // helpers for tests
      _emit: emit,
    } as unknown as NodeJS.ReadStream & {
      /** Manually emit events to any registered listeners */
      _emit: (evt: string, ...args: unknown[]) => void;
    },
    stdout: {
      write: vi.fn(() => true),
    } as unknown as NodeJS.WriteStream,
    stderr: {
      write: vi.fn(() => true),
    } as unknown as NodeJS.WriteStream,
  };

  return ports;
}

/**
 * Minimal ChildProcess-like fake with stdout/stderr event emitters and stdin/killer.
 *
 * @returns Fake worker object exposing stdout/stderr emitters, stdin stubs, and exit signaling.
 */
function makeWorker(): {
  /** Emits 'data' events as the worker's stdout */
  stdout: EventEmitter;
  /** Emits 'data' events as the worker's stderr */
  stderr: EventEmitter;
  /** Writable-like stdin stub for the worker */
  stdin: {
    /** Write to the worker's stdin */
    write: ReturnType<typeof vi.fn>;
    /** End the worker's stdin */
    end: ReturnType<typeof vi.fn>;
  };
  /** Kill stub to simulate sending signals to the worker */
  kill: ReturnType<typeof vi.fn>;
  /** Register event listener (e.g., 'exit') */
  on: (evt: string, fn: (...a: unknown[]) => void) => void;
  /** Register one-time event listener (e.g., 'exit') */
  once: (evt: string, fn: (...a: unknown[]) => void) => void;
  /** Remove a previously-registered event listener */
  off: (evt: string, fn: (...a: unknown[]) => void) => void;
  /** Test helper to emit an 'exit' event */
  _emitExit: (code?: number, signal?: NodeJS.Signals | null) => void;
} {
  const ee = new EventEmitter();
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdin = {
    write: vi.fn(),
    end: vi.fn(),
  };
  return {
    stdout,
    stderr,
    stdin,
    kill: vi.fn(),
    on: (evt: string, fn: (...a: unknown[]) => void) => {
      ee.on(evt, fn);
    },
    once: (evt: string, fn: (...a: unknown[]) => void) => {
      ee.once(evt, fn);
    },
    off: (evt: string, fn: (...a: unknown[]) => void) => {
      ee.off(evt, fn);
    },
    _emitExit: (code = 0, signal: NodeJS.Signals | null = null) => {
      ee.emit('exit', code, signal);
    },
  };
}

describe('installInteractiveSwitcher', () => {
  const mEmitKeypress = vi.mocked(readline.emitKeypressEvents);
  const mKeymap = vi.mocked(keymap);
  const mReplay = vi.mocked(replayFileTailToStdout);
  const mGetIds = vi.mocked(getWorkerIds);
  const mCycle = vi.mocked(cycleWorkers);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a no-op cleanup when stdin is not a TTY', () => {
    const ports = makePorts(false);
    const cleanup = installInteractiveSwitcher({
      workers: new Map(),
      ports,
    });
    expect(typeof cleanup).toBe('function');
    expect(mEmitKeypress).not.toHaveBeenCalled();
    expect(ports.stdin.setRawMode).not.toHaveBeenCalled();
    // call cleanup to ensure it’s safe
    expect(() => cleanup()).not.toThrow();
  });

  it('attaches on ATTACH: clears screen/banners, replays logs, hooks live streams', async () => {
    const ports = makePorts(true);
    const w1 = makeWorker();
    const workers = new Map<number, ReturnType<typeof makeWorker>>([[1, w1]]);

    const onEnterAttachScreen = vi.fn();
    const onAttach = vi.fn();

    // Provide log paths for replay
    const p: WorkerLogPaths = {
      structuredPath: '/s.log',
      outPath: '/o.log',
      errPath: '/e.log',
      infoPath: '/i.log',
      warnPath: '/w.log',
      errorPath: '/x.log',
    };

    installInteractiveSwitcher({
      workers: workers as unknown as Map<
        number,
        import('node:child_process').ChildProcess
      >,
      getLogPaths: (id) => (id === 1 ? p : undefined),
      onEnterAttachScreen,
      onAttach,
      ports,
    });

    // The switcher installed keypress handler; emulate a keypress → keymap returns ATTACH
    mKeymap.mockReturnValueOnce({ type: 'ATTACH', id: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '1', { name: '1' } as any);

    // allow async attach & sequential replays to complete
    await tick();

    // replay called for out/err (default = ['out','err'])
    expect(onEnterAttachScreen).toHaveBeenCalledWith(1);
    expect(mReplay).toHaveBeenCalledTimes(2);
    expect(mReplay).toHaveBeenCalledWith(
      '/o.log',
      expect.any(Number),
      expect.any(Function),
    );
    expect(mReplay).toHaveBeenCalledWith(
      '/e.log',
      expect.any(Number),
      expect.any(Function),
    );

    // replay header printed
    expect(ports.stdout.write).toHaveBeenCalledWith(
      '\n------------ replay ------------\n',
    );
    expect(ports.stdout.write).toHaveBeenCalledWith(
      '\n--- /o.log (last ~200KB) ---\n',
    );
    expect(ports.stdout.write).toHaveBeenCalledWith(
      '\n--- /e.log (last ~200KB) ---\n',
    );
    expect(ports.stdout.write).toHaveBeenCalledWith('[replayed]');
    expect(ports.stdout.write).toHaveBeenCalledWith(
      '\n--------------------------------\n\n',
    );

    // onAttach fired
    expect(onAttach).toHaveBeenCalledWith(1);

    // live mirroring works
    w1.stdout.emit('data', 'OUT');
    w1.stderr.emit('data', 'ERR');
    expect(ports.stdout.write).toHaveBeenCalledWith('OUT');
    expect(ports.stderr.write).toHaveBeenCalledWith('ERR');
  });

  it('DETACH removes stream listeners and calls onDetach; CTRL_C while attached sends SIGINT and detaches', async () => {
    const ports = makePorts(true);
    const w1 = makeWorker();
    const workers = new Map<number, ReturnType<typeof makeWorker>>([[1, w1]]);

    const onDetach = vi.fn();
    installInteractiveSwitcher({
      workers: workers as unknown as Map<
        number,
        import('node:child_process').ChildProcess
      >,
      onDetach,
      ports,
    });

    // Attach first
    mKeymap.mockReturnValueOnce({ type: 'ATTACH', id: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '1', { name: '1' } as any);
    await tick();

    // Now send DETACH
    mKeymap.mockReturnValueOnce({ type: 'DETACH' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '', { name: 'escape' } as any);
    expect(onDetach).toHaveBeenCalledTimes(1);

    // Emitting after detach should no-op
    w1.stdout.emit('data', 'X');
    w1.stderr.emit('data', 'Y');
    expect(ports.stdout.write).not.toHaveBeenCalledWith('X');
    expect(ports.stderr.write).not.toHaveBeenCalledWith('Y');

    // Attach again, then CTRL_C in attached mode → sends SIGINT + detaches
    mKeymap.mockReturnValueOnce({ type: 'ATTACH', id: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '1', { name: '1' } as any);
    await tick();

    mKeymap.mockReturnValueOnce({ type: 'CTRL_C' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '', { name: 'c', ctrl: true } as any);

    expect(w1.kill).toHaveBeenCalledWith('SIGINT');
    expect(onDetach).toHaveBeenCalledTimes(2);
  });

  it('CTRL_D ends stdin of attached worker; FORWARD sends sequence; data fallback writes raw buffer', async () => {
    const ports = makePorts(true);
    const w1 = makeWorker();
    const workers = new Map<number, ReturnType<typeof makeWorker>>([[1, w1]]);

    installInteractiveSwitcher({
      workers: workers as unknown as Map<
        number,
        import('node:child_process').ChildProcess
      >,
      ports,
    });

    // Attach
    mKeymap.mockReturnValueOnce({ type: 'ATTACH', id: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '1', { name: '1' } as any);
    await tick();

    // CTRL_D
    mKeymap.mockReturnValueOnce({ type: 'CTRL_D' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '', { name: 'd', ctrl: true } as any);
    expect(w1.stdin.end).toHaveBeenCalledTimes(1);

    // FORWARD sequence
    mKeymap.mockReturnValueOnce({ type: 'FORWARD', sequence: 'abc' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', 'a', { sequence: 'abc' } as any);
    expect(w1.stdin.write).toHaveBeenCalledWith('abc');

    // Raw data fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('data', Buffer.from('Z') as any);
    expect(w1.stdin.write).toHaveBeenCalledWith(Buffer.from('Z'));

    // ensure cleanup disables raw mode and shows cursor
    const cleanup = installInteractiveSwitcher({
      workers: workers as unknown as Map<
        number,
        import('node:child_process').ChildProcess
      >,
      ports,
    });
    cleanup();
    expect(ports.stdin.setRawMode).toHaveBeenCalledWith(false);
    expect(ports.stdout.write).toHaveBeenCalledWith('\x1b[?25h');
  });

  it('CYCLE in dashboard uses workerIds helpers to attach next worker', async () => {
    const ports = makePorts(true);
    const w1 = makeWorker();
    const w2 = makeWorker();
    const workers = new Map<number, ReturnType<typeof makeWorker>>([
      [1, w1],
      [2, w2],
    ]);

    const onAttach = vi.fn();
    installInteractiveSwitcher({
      workers: workers as unknown as Map<
        number,
        import('node:child_process').ChildProcess
      >,
      onAttach,
      ports,
    });

    // CYCLE delta +1 → our mock returns worker id 1
    mKeymap.mockReturnValueOnce({ type: 'CYCLE', delta: +1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '', { name: 'tab' } as any);
    await tick();

    expect(mGetIds).toHaveBeenCalled();
    expect(mCycle).toHaveBeenCalled();
    expect(onAttach).toHaveBeenCalledWith(1);
  });

  it('QUIT in dashboard calls onCtrlC; auto-detach on child "exit"', async () => {
    const ports = makePorts(true);
    const w1 = makeWorker();
    const workers = new Map<number, ReturnType<typeof makeWorker>>([[1, w1]]);
    const onCtrlC = vi.fn();
    const onDetach = vi.fn();

    installInteractiveSwitcher({
      workers: workers as unknown as Map<
        number,
        import('node:child_process').ChildProcess
      >,
      onCtrlC,
      onDetach,
      ports,
    });

    // Attach first to register exit handler
    mKeymap.mockReturnValueOnce({ type: 'ATTACH', id: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', '1', { name: '1' } as any);
    await tick();

    // Simulate child exit → should auto-detach
    w1._emitExit(1, null);
    expect(onDetach).toHaveBeenCalled();

    // Now QUIT in dashboard
    mKeymap.mockReturnValueOnce({ type: 'QUIT' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ports.stdin._emit('keypress', 'q', { name: 'q' } as any);
    expect(onCtrlC).toHaveBeenCalled();
  });
});
/* eslint-enable no-underscore-dangle,max-lines */
