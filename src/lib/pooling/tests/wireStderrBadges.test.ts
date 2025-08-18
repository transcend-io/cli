import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { wireStderrBadges } from '../diagnostics';
import { classifyLogLevel, makeLineSplitter } from '../logRotation';

/**
 * Mock collaborators BEFORE importing the SUT.
 * Path is relative to THIS test file.
 */
vi.mock('../logRotation', () => {
  // Provide a splitter that simply forwards the chunk to the callback as a single "line"
  const makeLineSplitter = vi.fn(
    (cb: (line: string) => void) => (chunk: unknown) => cb(String(chunk)),
  );
  return {
    classifyLogLevel: vi.fn(),
    makeLineSplitter,
  };
});

const mockedClassify = vi.mocked(classifyLogLevel);
const mockedMakeSplitter = vi.mocked(makeLineSplitter);

/**
 * Minimal ChildProcess-like object with an EventEmitter for stderr
 *
 * @returns - A mock child process with stderr
 */
function childWithStderr(): ChildProcess {
  const stderr = new EventEmitter();
  return { stderr } as unknown as ChildProcess;
}

/**
 * ChildProcess-like without stderr to exercise early return
 *
 * @returns - A mock child process without stderr
 */
function childWithoutStderr(): ChildProcess {
  return {} as unknown as ChildProcess;
}

describe('wireStderrBadges', () => {
  let repaint: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    repaint = vi.fn();
  });

  afterEach(() => {
    // no-op for now
  });

  it('early-returns when child has no stderr (no splitter, no listeners)', () => {
    const id = 1;
    const child = childWithoutStderr();
    const workerState = new Map();

    wireStderrBadges(id, child, workerState, repaint);

    // Since stderr was falsy, makeLineSplitter should not be called at all
    expect(mockedMakeSplitter).not.toHaveBeenCalled();
    expect(repaint).not.toHaveBeenCalled();
  });

  it('treats lines as WARN when classifyLogLevel returns null; updates state and repaints', () => {
    const id = 2;
    const child = childWithStderr();
    const workerState = new Map<
      number,
      {
        /** Last log level */
        lastLevel: 'ok' | 'warn' | 'error';
      }
    >();
    workerState.set(id, { lastLevel: 'ok' });

    mockedClassify.mockReturnValue(null); // no explicit tag → treat as 'warn'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wireStderrBadges(id, child, workerState as any, repaint);

    // Emit a stderr "data" chunk; splitter forwards to callback
    (child.stderr as unknown as EventEmitter).emit(
      'data',
      'some line without tag',
    );

    expect(workerState.get(id)?.lastLevel).toBe('warn');
    expect(repaint).toHaveBeenCalledTimes(1);

    // Emit again with same effective level; should not repaint twice
    (child.stderr as unknown as EventEmitter).emit('data', 'another line');
    expect(repaint).toHaveBeenCalledTimes(1);
  });

  it('updates to ERROR when classifyLogLevel returns "error"; repaints once', () => {
    const id = 3;
    const child = childWithStderr();
    const workerState = new Map<
      number,
      {
        /** Last log level */
        lastLevel: 'ok' | 'warn' | 'error';
      }
    >();
    workerState.set(id, { lastLevel: 'warn' });

    mockedClassify.mockReturnValue('error');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wireStderrBadges(id, child, workerState as any, repaint);

    (child.stderr as unknown as EventEmitter).emit('data', '[ERROR] boom!');
    expect(workerState.get(id)?.lastLevel).toBe('error');
    expect(repaint).toHaveBeenCalledTimes(1);

    // Emitting another error line should not repaint again if level unchanged
    (child.stderr as unknown as EventEmitter).emit('data', 'still error');
    expect(repaint).toHaveBeenCalledTimes(1);
  });

  it('does nothing if worker state for id is missing', () => {
    const id = 4;
    const child = childWithStderr();
    const workerState = new Map<number, unknown>();

    mockedClassify.mockReturnValue('warn');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wireStderrBadges(id, child, workerState as any, repaint);

    (child.stderr as unknown as EventEmitter).emit('data', 'warn-ish line');
    expect(workerState.has(id)).toBe(false);
    expect(repaint).not.toHaveBeenCalled();
  });
});
