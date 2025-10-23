import { describe, it, beforeEach, expect } from 'vitest';
import got from 'got';
import { RateLimitClient } from '../rateLimit';

/**
 * A mock of the RateLimitClient class for testing
 */
class RateLimitClientMock extends RateLimitClient {
  /**
   * Update the rate limit information and last response.
   * Forcing this to be public to allow testing.
   *
   * @param args - The arguments to pass to the parent class
   */
  public override updateRateLimitInfo(
    ...args: Parameters<RateLimitClient['updateRateLimitInfo']>
  ): ReturnType<RateLimitClient['updateRateLimitInfo']> {
    super.updateRateLimitInfo(...args);
  }
}

describe('rateLimit', () => {
  let rateLimiter: RateLimitClientMock;
  beforeEach(() => {
    rateLimiter = new RateLimitClientMock();
  });

  it('should wait until the rate limit resets', async () => {
    const timeToWait = 1000;
    rateLimiter.updateRateLimitInfo({
      limit: 10,
      remaining: 0,
      reset: new Date(Date.now() + timeToWait),
    });
    const before = Date.now();
    try {
      await rateLimiter.withRateLimit(() => got.get('does/not/matter'));
    } catch {
      // Doesn't matter
    }
    const after = Date.now();

    expect(after - before).toBeGreaterThanOrEqual(timeToWait);
  });

  it('should return the response from the API', async () => {
    const response = await rateLimiter.withRateLimit(() =>
      got.get<{
        /** The pokemon's height in decimeters */
        height: number;
      }>('https://pokeapi.co/api/v2/pokemon/ditto', {
        responseType: 'json',
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.height).toBe(3);
  });

  it('should decrement rate limit remaining', async () => {
    // This public API supports the 'x-ratelimit-remaining' header
    const url = 'https://www.reddit.com/r/javascript.json';

    // Run an initial request to hydrate the rate limit info
    const res = await rateLimiter.withRateLimit(() => got.get(url));
    let prevRemaining: number = rateLimiter.remaining!;
    expect(rateLimiter.remaining).toBeDefined();

    // Test corner case: wait for a reset if we're 3 seconds away from resetting the `remaining` counter
    const reset = res.headers['x-ratelimit-reset'];
    if (typeof reset === 'string') {
      // `x-ratelimit-reset` is in seconds on the Reddit API (and not a timestamp like our RateLimitClient expects)
      const resetSeconds = Number.parseInt(reset, 10);
      if (resetSeconds <= 3) {
        // Wait for the reset to happen
        await new Promise((resolve) => {
          setTimeout(resolve, (resetSeconds + 1) * 1000);
        });
        // Re-run the initial request to hydrate the rate limit info
        await rateLimiter.withRateLimit(() => got.get(url));
        prevRemaining = rateLimiter.remaining!;
      }
    }

    // The actual test: confirm that it decrements properly with each request
    for (let i = 0; i < 3; i += 1) {
      await rateLimiter.withRateLimit(() => got.get(url));
      expect(prevRemaining - 1).toBe(rateLimiter.remaining!);
      prevRemaining = rateLimiter.remaining!;
    }
  });
});
