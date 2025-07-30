import type { IncomingHttpHeaders } from 'node:http';
import { RequestError, type CancelableRequest, type Response } from 'got';
import { logger } from '../logger';

/**
 * Get the rate limit from the headers
 *
 * @param headers - The headers to get the rate limit from
 * @returns The rate limit
 */
export function getRateLimit(headers: IncomingHttpHeaders): {
  /** Limit of requests at the time window */
  limit: number | undefined;
  /** Remaining requests */
  remaining: number | undefined;
  /** Reset time */
  reset: Date | undefined;
} {
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
 * Wrap repeated `got` calls with rate limit handling.
 */
export class RateLimitClient {
  private static readonly MAX_WAIT_TIME_MS = 3 * 60 * 1000;

  /** Limit of requests at the time window */
  private limit: number | undefined;

  /** Remaining requests */
  private remaining: number | undefined;

  /** Reset time */
  private reset: Date | undefined;

  /** Last response */
  private lastResponse: Response<unknown> | undefined;

  /**
   * Create a new rate limit client
   */
  constructor() {
    this.limit = undefined;
    this.remaining = undefined;
    this.reset = undefined;
    this.lastResponse = undefined;
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
   * Wrap a `got` call with a rate limit
   *
   * @param callback - The got call
   * @returns The response
   */
  async withRateLimit<TBody = unknown>(
    callback: () => CancelableRequest<Response<TBody>>,
  ): Promise<Response<TBody>> {
    if (
      this.reset &&
      this.reset > new Date() &&
      (this.lastResponse?.statusCode === 429 ||
        (this.remaining && this.remaining <= 0))
    ) {
      const timeUntilResetMs = this.reset.getTime() - new Date().getTime();

      // Throw if it's beyond the maximum wait time
      if (timeUntilResetMs > RateLimitClient.MAX_WAIT_TIME_MS) {
        throw new Error(
          `The time until the rate limit resets (${RateLimitClient.formatMs(
            timeUntilResetMs,
          )})` +
            ` is beyond the maximum wait time (${RateLimitClient.formatMs(
              RateLimitClient.MAX_WAIT_TIME_MS,
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
        const rateLimit = getRateLimit(error.response.headers);
        this.limit = rateLimit.limit;
        this.remaining = rateLimit.remaining;
        this.reset = rateLimit.reset;
        this.lastResponse = error.response;

        logger.warn('A rate limit was exceeded on this request. Retrying...', {
          cause: error,
        });

        // If the error is a 429, we can retry the request
        return this.withRateLimit(callback);
      }
      throw error;
    }

    const rateLimit = getRateLimit(response.headers);
    this.limit = rateLimit.limit;
    this.remaining = rateLimit.remaining;
    this.reset = rateLimit.reset;
    this.lastResponse = response;

    return response;
  }
}
