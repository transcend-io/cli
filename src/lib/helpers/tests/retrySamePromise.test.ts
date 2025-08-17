// src/lib/helpers/tests/retrySamePromise.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { retrySamePromise, type RetryPolicy } from '../retrySamePromise';
import { sleepPromise } from '../sleepPromise';

// Mock the sleep helper so we don't actually wait during tests
vi.mock('../sleepPromise', () => ({
  sleepPromise: vi.fn(() => Promise.resolve()),
}));

/**
 * Helper to make got-like errors
 *
 * @param options -  Option
 * @returns - Error object with response structure
 */
function makeErr({
  statusCode,
  status,
  body,
  message,
}: {
  /** The HTTP status code */
  statusCode?: number;
  /** The HTTP status */
  status?: number;
  /** The response body, if any */
  body?: string;
  /** The error message, if any */
  message?: string;
} = {}): Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e: any = new Error(message ?? 'boom');
  e.response = {};
  if (statusCode !== undefined) e.response.statusCode = statusCode;
  if (status !== undefined) e.response.status = status;
  if (body !== undefined) e.response.body = body;
  if (!statusCode && !status && body === undefined && !message) {
    // leave it mostly empty to exercise "Unknown error"
    delete e.message;
    delete e.response;
  }
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('retrySamePromise', () => {
  it('succeeds on first try without retries', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const policy: RetryPolicy = {
      maxAttempts: 3,
      delayMs: 10,
      shouldRetry: vi.fn(() => true),
    };
    const onBackoff = vi.fn();

    const res = await retrySamePromise(op, policy, onBackoff);

    expect(res).to.equal('ok');
    expect(op).toHaveBeenCalledTimes(1);
    expect(onBackoff).not.toHaveBeenCalled();
    expect(sleepPromise).not.toHaveBeenCalled();
  });

  it('retries on retryable errors and eventually succeeds', async () => {
    const err1 = makeErr({ statusCode: 429, body: 'Rate limited' });
    const err2 = makeErr({ statusCode: 429, body: 'Rate limited again' });

    const op = vi
      .fn()
      .mockRejectedValueOnce(err1)
      .mockRejectedValueOnce(err2)
      .mockResolvedValue('ok');

    const policy: RetryPolicy = {
      maxAttempts: 3,
      delayMs: 42,
      shouldRetry: vi.fn((status) => status === 429),
    };
    const onBackoff = vi.fn();

    const res = await retrySamePromise(op, policy, onBackoff);

    expect(res).to.equal('ok');
    expect(op).toHaveBeenCalledTimes(3);
    expect(onBackoff).toHaveBeenCalledTimes(2);

    // ✅ Check substrings on the single note argument for each call
    expect(onBackoff).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('status=429'),
    );
    expect(onBackoff).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('attempt=1/3'),
    );
    expect(onBackoff).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('status=429'),
    );
    expect(onBackoff).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('attempt=2/3'),
    );

    expect(sleepPromise).toHaveBeenCalledTimes(2);
    expect(sleepPromise).toHaveBeenCalledWith(42);
  });

  it('does not retry when shouldRetry returns false', async () => {
    const err = makeErr({ statusCode: 400, body: 'Bad Request' });
    const op = vi.fn().mockRejectedValueOnce(err);

    const policy: RetryPolicy = {
      maxAttempts: 5,
      delayMs: 10,
      shouldRetry: vi.fn(() => false),
    };
    const onBackoff = vi.fn();

    await expect(retrySamePromise(op, policy, onBackoff)).rejects.to.equal(err);

    expect(op).toHaveBeenCalledTimes(1);
    expect(onBackoff).not.toHaveBeenCalled();
    expect(sleepPromise).not.toHaveBeenCalled();
  });

  it('throws after exceeding maxAttempts for retryable errors', async () => {
    // 429 three times; maxAttempts = 2 -> still fails on 3rd rejection
    const err = makeErr({ statusCode: 429, body: 'Rate limited' });
    const op = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err);

    const policy: RetryPolicy = {
      maxAttempts: 2,
      delayMs: 5,
      shouldRetry: vi.fn((status) => status === 429),
    };
    const onBackoff = vi.fn();

    await expect(retrySamePromise(op, policy, onBackoff)).rejects.to.equal(err);

    // initial try + 2 retries = 3 calls; backoff twice
    expect(op).toHaveBeenCalledTimes(3);
    expect(onBackoff).toHaveBeenCalledTimes(2);
    expect(sleepPromise).toHaveBeenCalledTimes(2);
  });

  it('uses response.status when statusCode is absent', async () => {
    const err = makeErr({ status: 502, body: 'Bad gateway' });
    const op = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const policy: RetryPolicy = {
      maxAttempts: 1,
      delayMs: 1,
      shouldRetry: vi.fn((status) => status === 502),
    };
    const onBackoff = vi.fn();

    const res = await retrySamePromise(op, policy, onBackoff);
    expect(res).to.equal('ok');

    expect(onBackoff).toHaveBeenCalledTimes(1);
    expect(onBackoff).toHaveBeenCalledWith(
      expect.stringContaining('status=502'),
    );
  });

  it('emits "Unknown error" in backoff note when error has no message/body/status', async () => {
    const err = makeErr({}); // stripped of message/response above
    const op = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const policy: RetryPolicy = {
      maxAttempts: 1,
      delayMs: 1,
      shouldRetry: vi.fn(() => true),
    };
    const onBackoff = vi.fn();

    const res = await retrySamePromise(op, policy, onBackoff);
    expect(res).to.equal('ok');

    expect(onBackoff).toHaveBeenCalledWith(
      expect.stringContaining('Unknown error'),
    );
  });
});
