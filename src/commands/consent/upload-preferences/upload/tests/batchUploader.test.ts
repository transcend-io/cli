import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// --- Import SUT & mocked symbols ---
import { uploadChunkWithSplit, type BatchUploaderDeps } from '../batchUploader';
import {
  getErrorStatus,
  extractErrorMessage,
  retrySamePromise,
  splitInHalf,
} from '../../../../../lib/helpers';
import { logger } from '../../../../../logger';
import type { PreferenceUpdateItem } from '@transcend-io/privacy-types';

// --- Mocks (declare BEFORE importing the SUT) ---
vi.mock('../../../../../lib/helpers', () => ({
  // Read status/message properties off the error object by default; override per test as needed.
  getErrorStatus: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err: unknown) => (err as any)?.status ?? (err as any)?.code,
  ),
  extractErrorMessage: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err: unknown) => (err as any)?.message ?? String(err),
  ),
  retrySamePromise: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fn, _policy, onNote?: (n: string) => void): any => {
      onNote?.('retrying once');
      return fn();
    },
  ),
  splitInHalf: vi.fn((entries) => {
    const mid = Math.floor(entries.length / 2);
    return [entries.slice(0, mid), entries.slice(mid)];
  }),
}));

vi.mock('../../../../../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// colors just returns the string; keeps logs simple
vi.mock('colors', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const passthrough = (s: string): any => s;
  return {
    default: {
      yellow: passthrough,
      red: passthrough,
    },
  };
});

const baseRetryImpl = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn, _policy, onNote?: (n: string) => void): any => {
    onNote?.('retrying once');
    return fn();
  },
);

// Helpers
const mkEntry = (id: string): [string, PreferenceUpdateItem] => [
  id,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { id } as any,
];

describe('uploadChunkWithSplit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure helpers are in their base state for every test
    (retrySamePromise as unknown as Mock).mockImplementation(baseRetryImpl);
    (splitInHalf as unknown as Mock).mockImplementation((entries) => {
      const mid = Math.floor(entries.length / 2);
      return [entries.slice(0, mid), entries.slice(mid)];
    });
  });

  it('uploads whole batch successfully (no retries, no splits)', async () => {
    const entries = [mkEntry('a'), mkEntry('b'), mkEntry('c')];

    const putBatch = vi.fn().mockResolvedValue(undefined);
    const deps: BatchUploaderDeps = {
      putBatch,
      retryPolicy: { maxAttempts: 3, delayMs: 10, shouldRetry: () => false },
      options: { skipWorkflowTriggers: false },
      isRetryableStatus: vi.fn(() => false),
    };

    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const onFailureSingle = vi.fn();
    const onFailureBatch = vi.fn();

    await uploadChunkWithSplit(entries, deps, {
      onSuccess,
      onFailureSingle,
      onFailureBatch,
    });

    expect(putBatch).toHaveBeenCalledTimes(1);
    expect(putBatch).toHaveBeenCalledWith(
      entries.map(([, u]) => u),
      deps.options,
    );
    expect(onSuccess).toHaveBeenCalledWith(entries);
    expect(onFailureSingle).not.toHaveBeenCalled();
    expect(onFailureBatch).not.toHaveBeenCalled();
  });

  it('retryable error → retried in-place → success (no split)', async () => {
    const entries = [mkEntry('x'), mkEntry('y')];

    // First call fails with retryable, second call succeeds
    const retryableErr = { status: 503, message: 'Service unavailable' };
    const putBatch = vi
      .fn()
      .mockRejectedValueOnce(retryableErr)
      .mockResolvedValueOnce(undefined);

    // Treat 503 as retryable

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getErrorStatus as any).mockImplementation((e: any) => e.status);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extractErrorMessage as any).mockImplementation((e: any) => e.message);

    const deps: BatchUploaderDeps = {
      putBatch,
      retryPolicy: {
        maxAttempts: 3,
        delayMs: 1,
        shouldRetry: () => true, // retryable by default
      },
      options: { skipWorkflowTriggers: false },
      isRetryableStatus: vi.fn((s?: number) => s === 503),
    };

    const onSuccess = vi.fn().mockResolvedValue(undefined);

    await uploadChunkWithSplit(entries, deps, {
      onSuccess,
      onFailureSingle: vi.fn(),
      onFailureBatch: vi.fn(),
    });

    // Initial try + retrySamePromise path calls putBatch once more
    expect(putBatch).toHaveBeenCalledTimes(2);
    expect(retrySamePromise).toHaveBeenCalledTimes(1);
    expect(deps.isRetryableStatus).toHaveBeenCalledWith(503);
    expect(onSuccess).toHaveBeenCalledWith(entries);
    expect(splitInHalf).not.toHaveBeenCalled();
  });

  it('exhausted retries for retryable error → marks entire batch as failed (no split)', async () => {
    const entries = [mkEntry('a'), mkEntry('b'), mkEntry('c')];

    const retryableErr = { status: 429, message: 'Too Many Requests' };
    const putBatch = vi.fn().mockRejectedValue(retryableErr);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getErrorStatus as any).mockImplementation((e: any) => e.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extractErrorMessage as any).mockImplementation((e: any) => e.message);

    // Make retrySamePromise invoke fn and still throw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (retrySamePromise as any).mockImplementation(async (fn: any) => {
      await expect(fn()).rejects.toBe(retryableErr);
      throw retryableErr;
    });

    const deps: BatchUploaderDeps = {
      putBatch,
      retryPolicy: { maxAttempts: 2, delayMs: 1, shouldRetry: () => true },
      options: { skipWorkflowTriggers: false },
      isRetryableStatus: vi.fn((s?: number) => s === 429),
    };

    const onFailureBatch = vi.fn().mockResolvedValue(undefined);

    await uploadChunkWithSplit(entries, deps, {
      onSuccess: vi.fn(),
      onFailureSingle: vi.fn(),
      onFailureBatch,
    });

    expect(deps.isRetryableStatus).toHaveBeenCalledWith(429);
    expect(retrySamePromise).toHaveBeenCalledTimes(1);
    expect(onFailureBatch).toHaveBeenCalledWith(entries, retryableErr);
    expect(splitInHalf).not.toHaveBeenCalled(); // must NOT split for retryable exhaustion
    expect(logger.error).toHaveBeenCalled();
  });

  it('non-retryable error → splits and recurses', async () => {
    const entries = [mkEntry('1'), mkEntry('2'), mkEntry('3'), mkEntry('4')];

    // First attempt non-retryable
    const nonRetryableErr = { status: 400, message: 'Bad request' };

    // Strategy:
    // - First whole-batch call fails (non-retryable) → split [1,2] and [3,4]
    // - Left half succeeds; right half fails first, then succeeds after another split
    const putBatch = vi
      .fn()
      // initial whole batch fails
      .mockRejectedValueOnce(nonRetryableErr)
      // left half [1,2] succeeds
      .mockResolvedValueOnce(undefined)
      // right half [3,4] fails -> split again
      .mockRejectedValueOnce(nonRetryableErr)
      // [3] succeeds
      .mockResolvedValueOnce(undefined)
      // [4] succeeds
      .mockResolvedValueOnce(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getErrorStatus as any).mockImplementation((e: any) => e.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extractErrorMessage as any).mockImplementation((e: any) => e.message);

    const deps: BatchUploaderDeps = {
      putBatch,
      retryPolicy: { maxAttempts: 1, delayMs: 1, shouldRetry: () => false },
      options: { skipWorkflowTriggers: false },
      isRetryableStatus: vi.fn(() => false),
    };

    const onSuccess = vi.fn().mockResolvedValue(undefined);

    await uploadChunkWithSplit(entries, deps, {
      onSuccess,
      onFailureSingle: vi.fn(),
      onFailureBatch: vi.fn(),
    });

    // We expect splitInHalf to be used at least once
    expect(splitInHalf).toHaveBeenCalled();
    // Multiple putBatch invocations per recursion path
    expect(putBatch).toHaveBeenCalledTimes(5);
    // onSuccess called for each successful chunk ([1,2], [3], [4])
    expect(onSuccess).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalled(); // logged split reason
  });

  it('singleton non-retryable failure → onFailureSingle', async () => {
    const entries = [mkEntry('solo')];

    const nonRetryableErr = { status: 400, message: 'bad input' };

    // First try fails; in singleton path SUT re-attempts putAll once more
    const putBatch = vi
      .fn()
      .mockRejectedValueOnce(nonRetryableErr) // initial outer try
      .mockRejectedValueOnce(nonRetryableErr); // retry in singleton branch

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getErrorStatus as any).mockImplementation((e: any) => e.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extractErrorMessage as any).mockImplementation((e: any) => e.message);

    const deps: BatchUploaderDeps = {
      putBatch,
      retryPolicy: { maxAttempts: 1, delayMs: 1, shouldRetry: () => false },
      options: { skipWorkflowTriggers: false },
      isRetryableStatus: vi.fn(() => false),
    };

    const onFailureSingle = vi.fn().mockResolvedValue(undefined);

    await uploadChunkWithSplit(entries, deps, {
      onSuccess: vi.fn(),
      onFailureSingle,
      onFailureBatch: vi.fn(),
    });

    // Two attempts for the singleton: outer catch, then inner retry
    expect(putBatch).toHaveBeenCalledTimes(2);
    expect(onFailureSingle).toHaveBeenCalledWith(entries[0], nonRetryableErr);
  });

  it('treats 400 "slow down" as soft-rate-limit → retries in-place', async () => {
    const entries = [mkEntry('s1'), mkEntry('s2')];

    const softRateErr = { status: 400, message: 'Please slow down a bit' };

    const putBatch = vi
      .fn()
      .mockRejectedValueOnce(softRateErr)
      .mockResolvedValueOnce(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getErrorStatus as any).mockImplementation((e: any) => e.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extractErrorMessage as any).mockImplementation((e: any) => e.message);

    const deps: BatchUploaderDeps = {
      putBatch,
      retryPolicy: { maxAttempts: 2, delayMs: 1, shouldRetry: () => true },
      options: { skipWorkflowTriggers: false },
      isRetryableStatus: vi.fn(() => false), // not retryable by status, but soft-rate-limit triggers retry anyway
    };

    const onSuccess = vi.fn().mockResolvedValue(undefined);

    await uploadChunkWithSplit(entries, deps, {
      onSuccess,
      onFailureSingle: vi.fn(),
      onFailureBatch: vi.fn(),
    });

    expect(retrySamePromise).toHaveBeenCalledTimes(1);
    expect(putBatch).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledWith(entries);
    expect(splitInHalf).not.toHaveBeenCalled();
  });

  it('treats 400 "Throughput exceeds" as soft-rate-limit → retries in-place', async () => {
    const entries = [mkEntry('t1'), mkEntry('t2')];

    const throughputErr = {
      status: 400,
      message: 'Throughput exceeds the current capacity',
    };

    const putBatch = vi
      .fn()
      .mockRejectedValueOnce(throughputErr)
      .mockResolvedValueOnce(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getErrorStatus as any).mockImplementation((e: any) => e.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extractErrorMessage as any).mockImplementation((e: any) => e.message);

    const deps: BatchUploaderDeps = {
      putBatch,
      retryPolicy: { maxAttempts: 2, delayMs: 1, shouldRetry: () => true },
      options: { skipWorkflowTriggers: false },
      isRetryableStatus: vi.fn(() => false),
    };

    const onSuccess = vi.fn().mockResolvedValue(undefined);

    await uploadChunkWithSplit(entries, deps, {
      onSuccess,
      onFailureSingle: vi.fn(),
      onFailureBatch: vi.fn(),
    });

    expect(retrySamePromise).toHaveBeenCalledTimes(1);
    expect(putBatch).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledWith(entries);
    expect(splitInHalf).not.toHaveBeenCalled();
  });
});
