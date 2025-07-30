import { RequestError, type CancelableRequest, type Response } from 'got';
import { logger } from '../logger';

interface RateLimitInfo {
  /** Total number of requests available per reset */
  limit: number | undefined;
  /** Remaining number of requests until reset */
  remaining: number | undefined;
  /** Time at which the limit will next reset */
  reset: Date | undefined;
}

/**
 * Wrap repeated `got` calls with rate limit handling.
 */
export class RateLimitClient {
  private static readonly MAX_WAIT_TIME_MS = 3 * 60 * 1000;

  /** Total number of requests available per reset */
  private limit: number | undefined;

  /** Remaining number of requests until reset */
  private remaining: number | undefined;

  /** Time at which the limit will next reset */
  private reset: Date | undefined;

  /** Last response */
  private lastResponse: Response<unknown> | undefined;

  /**
   * Create a new rate limit client. Best to create a new instance for each batch of calls to an endpoint.
   */
  constructor() {
    this.limit = undefined;
    this.remaining = undefined;
    this.reset = undefined;
    this.lastResponse = undefined;
  }

  /**
   * Get the rate limit information from the headers
   *
   * @param headers - The headers from the got Response
   * @returns The rate limit information
   */
  static getRateLimitInfo(headers: Response['headers']): RateLimitInfo {
    return {
      limit:
        typeof headers['x-ratelimit-limit'] === 'string'
          ? Number.parseInt(headers['x-ratelimit-limit'], 10)
          : undefined,
      remaining:
        typeof headers['x-ratelimit-remaining'] === 'string'
          ? Number.parseInt(headers['x-ratelimit-remaining'], 10)
          : undefined,
      reset:
        typeof headers['x-ratelimit-reset'] === 'string'
          ? new Date(Number.parseInt(headers['x-ratelimit-reset'], 10) * 1000)
          : undefined,
    };
  }

  /**
   * Format a number of milliseconds to a string of seconds
   *
   * @param ms - The number of milliseconds
   * @returns The number of seconds
   */
  static formatMs(ms: number): string {
    return `${(ms / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}s`;
  }

  /**
   * Update the rate limit information and last response
   *
   * @param rateLimit - The rate limit information
   * @param lastResponse - The last response
   */
  protected updateRateLimitInfo(
    rateLimit: RateLimitInfo,
    lastResponse?: Response<unknown>,
  ): void {
    this.limit = rateLimit.limit;
    this.remaining = rateLimit.remaining;
    this.reset = rateLimit.reset;
    this.lastResponse = lastResponse;
  }

  /**
   * Wrap a `got` call with a rate limit
   *
   * @param callback - The call to `got`. It should return a Response, so do NOT chain `.json()` or `.text()`—use responseType instead.
   * @param options - Options for rate limit handling
   * @returns The `got` Response object
   * @example
   * ```ts
   * for (const page of [1, 2, 3]) {
   *   const response = await rateLimiter.withRateLimit(() =>
   *     got.get<{ id: number; title: string }>(`https://example.com/posts?page=${page}`, { responseType: 'json' }),
   *   );
   *   console.log(response.body.title);
   * }
   * ```
   */
  async withRateLimit<TBody = unknown>(
    callback: () => CancelableRequest<Response<TBody>>,
    {
      maxWaitTimeMs = RateLimitClient.MAX_WAIT_TIME_MS,
    }: {
      /**
       * The number of milliseconds to wait until the rate limit resets.
       * If not provided, the default maximum wait time will be used.
       */
      maxWaitTimeMs?: number;
    } = {},
  ): Promise<Response<TBody>> {
    if (
      this.reset &&
      this.reset > new Date() &&
      (this.lastResponse?.statusCode === 429 ||
        (this.remaining && this.remaining <= 0))
    ) {
      const timeUntilResetMs = this.reset.getTime() - new Date().getTime();

      // Throw if it's beyond the maximum wait time
      if (timeUntilResetMs > maxWaitTimeMs) {
        throw new Error(
          `The time until the rate limit resets (${RateLimitClient.formatMs(
            timeUntilResetMs,
          )})` +
            ` is beyond the maximum wait time (${RateLimitClient.formatMs(
              maxWaitTimeMs,
            )}). Try again in ${this.reset.toLocaleString()}${
              this.limit
                ? `, when the rate limit resets to ${this.limit.toLocaleString()}.`
                : ''
            }.`,
          { cause: this.lastResponse?.body },
        );
      }

      // Wait until it resets before trying the request
      logger.warn(
        `Waiting until the rate limit resets (${RateLimitClient.formatMs(
          timeUntilResetMs,
        )}).`,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, timeUntilResetMs);
      });
    }

    let response: Response<TBody>;
    try {
      response = await callback();
    } catch (error) {
      if (error instanceof RequestError && error.response?.statusCode === 429) {
        const rateLimit = RateLimitClient.getRateLimitInfo(
          error.response.headers,
        );
        this.updateRateLimitInfo(rateLimit, error.response);

        logger.warn('A rate limit was exceeded on this request. Retrying...');

        // If the error is a 429, we can retry the request
        return this.withRateLimit(callback);
      }
      throw error;
    }

    const rateLimit = RateLimitClient.getRateLimitInfo(response.headers);
    this.updateRateLimitInfo(rateLimit, response);

    return response;
  }
}
