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

const rateLimiter = new RateLimitClientMock();
rateLimiter.updateRateLimitInfo({
  limit: 10,
  remaining: 0,
  reset: new Date(Date.now() + 1000),
});

describe('rateLimit', () => {
  beforeEach(() => {
    rateLimiter.updateRateLimitInfo({
      limit: 10,
      remaining: 0,
      reset: new Date(Date.now() + 1000),
    });
  });

  it('should wait until the rate limit resets', async () => {
    const timeToWait = 10000;
    rateLimiter.updateRateLimitInfo({
      limit: 10,
      remaining: 0,
      reset: new Date(Date.now() + timeToWait),
    });
    const before = Date.now();
    await rateLimiter.withRateLimit(() =>
      got.get('https://api.transcend.io/info', {
        throwHttpErrors: false,
      }),
    );
    const after = Date.now();

    expect(after - before).toBeGreaterThan(timeToWait);
  });
});
