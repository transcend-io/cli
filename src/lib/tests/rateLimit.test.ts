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
  remaining: 10,
  reset: new Date(Date.now() + 1000),
});

for (const r of ['my', 'array']) {
  const response = await rateLimiter.withRateLimit(() =>
    got.get(`https://example.com.com/${r}`, {
      isStream: false,
      resolveBodyOnly: false,
      responseType: 'buffer',
    }),
  );

  console.log(response);
}
