/* eslint-disable require-await */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  withPreferenceRetry,
  RETRY_PREFERENCE_MSGS,
} from '../withPreferenceRetry';

// Hoist shared spies so the mock factory can capture them
const H = vi.hoisted(() => ({
  loggerSpies: {
    warn: vi.fn(),
  },
  sleepSpy: vi.fn().mockResolvedValue(undefined),
}));

/** Mock deps BEFORE importing SUT */
vi.mock('../../../logger', () => ({
  logger: H.loggerSpies,
}));

vi.mock('../../helpers', () => ({
  sleepPromise: H.sleepSpy,
}));

// Avoid coloring flake in snapshots; just return the input string
vi.mock('colors', () => ({
  default: {
    yellow: (s: string) => s,
  },
  yellow: (s: string) => s,
}));

describe('withPreferenceRetry', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic jitter
  });

  afterEach(() => {
    vi.restoreAllMocks();
    H.loggerSpies.warn.mockClear();
    H.sleepSpy.mockClear();
  });

  it('returns immediately on first success (no retries)', async () => {
    const fn = vi.fn(async (): Promise<string> => 'ok');

    const out = await withPreferenceRetry('Preference Query', fn);
    expect(out).toEqual('ok');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(H.loggerSpies.warn).not.toHaveBeenCalled();
    expect(H.sleepSpy).not.toHaveBeenCalled();
  });

  it('retries on a retryable error and then succeeds; logs and sleeps with backoff+jitter', async () => {
    // First call throws retryable, second succeeds
    const retryMsg = RETRY_PREFERENCE_MSGS[0];
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error(retryMsg))
      .mockResolvedValueOnce('ok-2');

    const onRetry = vi.fn();
    const out = await withPreferenceRetry('Preference Query', fn, {
      baseDelayMs: 200, // backoff = 200 * 2^(attempt-1)
      onRetry,
    });

    expect(out).toEqual('ok-2');
    expect(fn).toHaveBeenCalledTimes(2);

    // onRetry called once for the first failure
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][0]).toBe(1); // attempt number
    expect(String(onRetry.mock.calls[0][2])).toContain(retryMsg);

    // Logged a warning and slept ~ backoff + jitter
    expect(H.loggerSpies.warn).toHaveBeenCalledTimes(1);
    // baseDelayMs(200) * 2^(1-1) = 200, jitter = floor(0.5 * 200) = 100 -> 300
    expect(H.sleepSpy).toHaveBeenCalledWith(300);
  });

  it('stops retrying and throws if error is non-retryable', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Something fatal'));

    await expect(
      withPreferenceRetry('Preference Query', fn, {
        maxAttempts: 5,
      }),
    ).rejects.toThrow('Preference query failed after 1 attempt(s):');

    // No retries, no sleeps, no logs
    expect(fn).toHaveBeenCalledTimes(1);
    expect(H.loggerSpies.warn).not.toHaveBeenCalled();
    expect(H.sleepSpy).not.toHaveBeenCalled();
  });

  it('exhausts maxAttempts on retryable error and then throws', async () => {
    const retryMsg = RETRY_PREFERENCE_MSGS[1];
    const fn = vi.fn().mockRejectedValue(new Error(retryMsg));

    await expect(
      withPreferenceRetry('Preference Query', fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
      }),
    ).rejects.toThrow('Preference query failed after 3 attempt(s):');

    expect(fn).toHaveBeenCalledTimes(3);
    // Two intervals (between 1->2 and 2->3)
    expect(H.sleepSpy).toHaveBeenCalledTimes(2);

    // Delays: attempt 1 => 100 + 50 = 150; attempt 2 => 200 + 50 = 250
    expect(H.sleepSpy.mock.calls[0][0]).toBe(150);
    expect(H.sleepSpy.mock.calls[1][0]).toBe(250);
  });

  it('honors custom isRetryable predicate', async () => {
    // Message is NOT in default list, but custom predicate makes it retryable
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 2) throw new Error('custom-transient-edge');
      return 'ok-custom';
    });

    const out = await withPreferenceRetry('Preference Query', fn, {
      isRetryable: (_err, msg) => msg.includes('custom-transient'),
      baseDelayMs: 10,
    });

    expect(out).toEqual('ok-custom');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(H.sleepSpy).toHaveBeenCalledTimes(1);
  });
});
/* eslint-enable require-await */
