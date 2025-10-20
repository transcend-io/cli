import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runChild } from '../worker';

const h = vi.hoisted(() => ({
  mLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  mExtractErrorMessage: vi.fn((e: unknown) => String(e)),
  mParquetToCsvOneFile: vi.fn(() => Promise.resolve()),
}));

// Mock EXACT module ids the SUT imports
vi.mock('../../../../logger', () => ({ logger: h.mLogger }));
vi.mock('../../../../lib/helpers', () => ({
  extractErrorMessage: (...a: Parameters<typeof h.mExtractErrorMessage>) =>
    h.mExtractErrorMessage(...a),
  parquetToCsvOneFile: (...a: Parameters<typeof h.mParquetToCsvOneFile>) =>
    h.mParquetToCsvOneFile(...a),
}));

// Aliases
const { mLogger, mExtractErrorMessage, mParquetToCsvOneFile } = h;

/**
 * Tick helper to allow async handlers to run
 *
 * @returns A promise that resolves on next tick
 */
const nextTick = (): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, 0);
  });

/**
 * Start worker and capture the specific 'message' handler it registers.
 * We diff the 'message' listeners before/after runChild() to find the one it added.
 *
 * @returns The 'message' event handler function registered by runChild.
 */
function startWorkerAndCaptureHandler(): (msg: unknown) => unknown {
  const before = new Set<(...a: unknown[]) => unknown>(
    process.listeners('message') as Array<(...a: unknown[]) => unknown>,
  );

  // runChild never resolves; don't await
  runChild();

  const after = new Set<(...a: unknown[]) => unknown>(
    process.listeners('message') as Array<(...a: unknown[]) => unknown>,
  );

  for (const listener of after) {
    if (!before.has(listener)) return listener as (msg: unknown) => unknown;
  }
  throw new Error('Failed to capture worker message handler');
}

describe('parquet-to-csv worker runChild()', () => {
  let origSend: unknown;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let origWorkerId: string | undefined;
  let workerMsgHandler: ((msg: unknown) => unknown) | undefined;

  beforeEach(() => {
    origWorkerId = process.env.WORKER_ID;
    process.env.WORKER_ID = '7';

    // Stub process.send
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    origSend = (process as any).send;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).send = vi.fn();

    // Spy process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => undefined as never) as unknown as typeof process.exit,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    mLogger.info.mockClear();
    mLogger.error.mockClear();
    mExtractErrorMessage.mockClear();
    mParquetToCsvOneFile.mockReset();

    workerMsgHandler = undefined;
  });

  afterEach(() => {
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

  it('announces ready, forwards progress from parquetToCsvOneFile, and reports success', async () => {
    // Make the helper fire progress twice, then resolve
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mParquetToCsvOneFile.mockImplementation(((args: any): Promise<void> => {
      args.onProgress?.(3, undefined);
      args.onProgress?.(10, 42);
      return Promise.resolve();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    workerMsgHandler = startWorkerAndCaptureHandler();

    // 'ready' should be sent immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((process as any).send).toHaveBeenCalledWith({ type: 'ready' });
    expect(mLogger.info).toHaveBeenCalledTimes(1);
    expect(mLogger.info.mock.calls[0][0]).toContain('[w7] ready');

    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/data/input.parquet',
        options: { outputDir: '/tmp/out', clearOutputDir: true },
      },
    } as const;

    workerMsgHandler(msg);
    await nextTick();

    expect(mParquetToCsvOneFile).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mParquetToCsvOneFile.mock.calls as any)[0][0];
    expect(callArgs).toMatchObject({
      filePath: '/abs/data/input.parquet',
      outputDir: '/tmp/out',
      clearOutputDir: true,
    });
    expect(callArgs.onProgress).toEqual(expect.any(Function));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sends = (process as any).send.mock.calls.map((c: any[]) => c[0]);
    expect(sends).toContainEqual({ type: 'ready' });
    expect(sends).toContainEqual({
      type: 'progress',
      payload: {
        filePath: '/abs/data/input.parquet',
        processed: 3,
        total: undefined,
      },
    });
    expect(sends).toContainEqual({
      type: 'progress',
      payload: {
        filePath: '/abs/data/input.parquet',
        processed: 10,
        total: 42,
      },
    });
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: true, filePath: '/abs/data/input.parquet' },
    });

    // Logs
    expect(mLogger.error).not.toHaveBeenCalled();
    expect(
      mLogger.info.mock.calls.some((c) => String(c[0]).includes('processing')),
    ).toBe(true);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('reports failure using extractErrorMessage and logs error', async () => {
    mExtractErrorMessage.mockReturnValue('Boom!');
    mParquetToCsvOneFile.mockImplementation(() => {
      throw new Error('nope');
    });

    workerMsgHandler = startWorkerAndCaptureHandler();

    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/bad.parquet',
        options: { clearOutputDir: false },
      },
    } as const;

    workerMsgHandler(msg);
    await nextTick();

    expect(mLogger.error).toHaveBeenCalledTimes(1);
    const errLine = mLogger.error.mock.calls[0][0] as string;
    expect(errLine).toContain('[w7]');
    expect(errLine).toContain('ERROR');
    expect(errLine).toContain('/abs/bad.parquet');

    // We don't assert 'Boom!' in the log line because the worker logs `err.stack || message`.
    // Ensure `extractErrorMessage` was used and the result payload contains the mapped message.
    expect(mExtractErrorMessage).toHaveBeenCalledTimes(1);
    expect(mExtractErrorMessage.mock.calls[0][0]).toBeInstanceOf(Error);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sends = (process as any).send.mock.calls.map((c: any[]) => c[0]);
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: false, filePath: '/abs/bad.parquet', error: 'Boom!' },
    });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits(0) on shutdown message', async () => {
    workerMsgHandler = startWorkerAndCaptureHandler();

    workerMsgHandler({ type: 'shutdown' });
    await nextTick();

    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
