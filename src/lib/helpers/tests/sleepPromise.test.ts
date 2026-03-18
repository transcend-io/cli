import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleepPromise } from '../sleepPromise';

describe('sleepPromise', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves after the specified delay and returns the delay value', async () => {
    const thenSpy = vi.fn();

    // Keep the original promise separate from the spy’s return value
    const p = sleepPromise(123);
    p.then(thenSpy);

    // Not resolved yet
    await Promise.resolve();
    expect(thenSpy).not.toHaveBeenCalled();

    // Advance most of the time — still not called
    await vi.advanceTimersByTimeAsync(122);
    expect(thenSpy).not.toHaveBeenCalled();

    // Final tick triggers resolution
    await vi.advanceTimersByTimeAsync(1);
    expect(thenSpy).toHaveBeenCalledTimes(1);
    expect(thenSpy).toHaveBeenCalledWith(123);

    // Original promise resolves to the delay value
    await expect(p).resolves.to.equal(123);
  });

  it('resolves on next tick when delay is 0', async () => {
    const thenSpy = vi.fn();

    const p = sleepPromise(0);
    p.then(thenSpy);

    // Nothing yet
    await Promise.resolve();
    expect(thenSpy).not.toHaveBeenCalled();

    // Run timers; 0ms timeout fires immediately under fake timers
    await vi.runAllTimersAsync();

    expect(thenSpy).toHaveBeenCalledOnce();
    expect(thenSpy).toHaveBeenCalledWith(0);
    await expect(p).resolves.to.equal(0);
  });
});
