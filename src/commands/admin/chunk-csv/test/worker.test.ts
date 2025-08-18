import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── SUT ───────────────────────────────────────────────────────────────────────
import { runChild } from '../worker';
import type { ChunkOpts } from '../../../../lib/helpers/chunkOneCsvFile';

const h = vi.hoisted(() => ({
  mLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  mExtractErrorMessage: vi.fn((e: unknown) => String(e)),
  mChunkOneCsvFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../logger', () => ({ logger: h.mLogger }));
vi.mock('../../../../lib/helpers', () => ({
  extractErrorMessage: (...a: Parameters<typeof h.mExtractErrorMessage>) =>
    h.mExtractErrorMessage(...a),
}));
vi.mock('../../../../lib/helpers/chunkOneCsvFile', () => ({
  chunkOneCsvFile: (...a: Parameters<typeof h.mChunkOneCsvFile>) =>
    h.mChunkOneCsvFile(...a),
}));

// Local aliases for convenience
const { mLogger } = h;
const { mExtractErrorMessage } = h;
const { mChunkOneCsvFile } = h;

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Microtask turn helper to allow handlers to run.
 *
 * @returns A promise that resolves on the next tick.
 */
const nextTick = (): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, 0);
  });

/**
 * Start the worker and capture the exact "message" listener it registers.
 * We diff the "message" listeners before/after `runChild()` to find the one it added.
 *
 * @returns The "message" event handler function registered by runChild.
 */
function startWorkerAndCaptureHandler(): (msg: unknown) => unknown {
  const before = new Set<(...a: unknown[]) => unknown>(
    process.listeners('message') as Array<(...a: unknown[]) => unknown>,
  );

  // Do NOT await; runChild never resolves by design.
  runChild();

  const after = new Set<(...a: unknown[]) => unknown>(
    process.listeners('message') as Array<(...a: unknown[]) => unknown>,
  );

  // Find the new listener added by runChild
  for (const listener of after) {
    if (!before.has(listener)) {
      return listener as (msg: unknown) => unknown;
    }
  }

  // If nothing found, fail loudly (should not happen)
  throw new Error('Failed to capture worker message handler');
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('chunk-csv worker runChild()', () => {
  let origSend: unknown;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let origWorkerId: string | undefined;
  let workerMsgHandler: ((msg: unknown) => unknown) | undefined;

  beforeEach(() => {
    origWorkerId = process.env.WORKER_ID;
    process.env.WORKER_ID = '7';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    origSend = (process as any).send;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).send = vi.fn();

    exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => undefined as never) as unknown as typeof process.exit,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    mLogger.info.mockClear();
    mLogger.error.mockClear();
    mExtractErrorMessage.mockClear();
    mChunkOneCsvFile.mockReset();

    workerMsgHandler = undefined;
  });

  afterEach(() => {
    // Remove only the worker handler we added, not every 'message' listener.
    if (workerMsgHandler) {
      process.removeListener(
        'message',
        workerMsgHandler as (...a: unknown[]) => void,
      );
      workerMsgHandler = undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).send = origSend;
    exitSpy.mockRestore();

    if (origWorkerId === undefined) {
      delete process.env.WORKER_ID;
    } else {
      process.env.WORKER_ID = origWorkerId;
    }
  });

  it('announces ready, forwards progress during chunking, and reports success', async () => {
    // Arrange
    mChunkOneCsvFile.mockImplementation(((args: ChunkOpts) => {
      args.onProgress(5, 10);
      args.onProgress(10, 10);
      return Promise.resolve();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    // Act
    workerMsgHandler = startWorkerAndCaptureHandler();

    // Assert: "ready" sent immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((process as any).send).toHaveBeenCalledWith({ type: 'ready' });
    expect(mLogger.info).toHaveBeenCalledTimes(1);
    expect(mLogger.info.mock.calls[0][0]).toContain('[w7] ready');

    // Send a task directly to the captured handler (avoid touching real IPC)
    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/foo.csv',
        options: { outputDir: '/out', clearOutputDir: true, chunkSizeMB: 64 },
      },
    } as const;

    workerMsgHandler(msg);
    await nextTick();

    expect(mChunkOneCsvFile).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mChunkOneCsvFile.mock.calls as any)[0]?.[0] as ChunkOpts;
    expect(callArgs).toMatchObject({
      filePath: '/abs/foo.csv',
      outputDir: '/out',
      clearOutputDir: true,
      chunkSizeMB: 64,
    });
    expect(callArgs.onProgress).toEqual(expect.any(Function));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sends = (process as any).send.mock.calls.map((c: any[]) => c[0]);
    expect(sends).toContainEqual({
      type: 'progress',
      payload: { filePath: '/abs/foo.csv', processed: 5, total: 10 },
    });
    expect(sends).toContainEqual({
      type: 'progress',
      payload: { filePath: '/abs/foo.csv', processed: 10, total: 10 },
    });
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: true, filePath: '/abs/foo.csv' },
    });

    expect(mLogger.error).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('reports failure using extractErrorMessage and logs error locally', async () => {
    // Arrange
    mExtractErrorMessage.mockReturnValue('Boom!');
    mChunkOneCsvFile.mockImplementation(() => {
      throw new Error('nope');
    });

    // Act
    workerMsgHandler = startWorkerAndCaptureHandler();

    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/bad.csv',
        options: { clearOutputDir: false, chunkSizeMB: 16 },
      },
    } as const;

    workerMsgHandler(msg);
    await nextTick();

    // Assert
    expect(mLogger.error).toHaveBeenCalledTimes(1);
    const line = mLogger.error.mock.calls[0][0] as string;
    expect(line).toContain('[w7]');
    expect(line).toContain('ERROR');
    expect(line).toContain('/abs/bad.csv');
    expect(line).toContain('Boom!');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sends = (process as any).send.mock.calls.map((c: any[]) => c[0]);
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: false, filePath: '/abs/bad.csv', error: 'Boom!' },
    });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits(0) on shutdown message', async () => {
    // Act
    workerMsgHandler = startWorkerAndCaptureHandler();

    workerMsgHandler({ type: 'shutdown' });
    await nextTick();

    // Assert
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
