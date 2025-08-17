/**
 * Tracks counts over time and calculates rates within a specified time window.
 *
 * This class maintains a rolling window of count "buckets" (timestamped values)
 * and provides methods to add new counts and compute the rate of events over a
 * configurable time window.
 *
 * Example usage:
 * ```typescript
 * const counter = new RateCounter();
 * counter.add(5); // Add 5 events
 * const rate = counter.rate(60_000); // Get rate over last 60 seconds
 * ```
 */
export class RateCounter {
  private buckets: Array<{
    /** Timestamp of the bucket */
    t: number;
    /** Number of events in the bucket */
    n: number;
  }> = [];

  /**
   * Adds a new count to the counter.
   *
   * @param n - The number of events to add to the counter.
   */
  add(n: number): void {
    const now = Date.now();
    this.buckets.push({ t: now, n });
    // keep last 2 minutes of buckets
    const cutoff = now - 120_000;
    while (this.buckets.length && this.buckets[0].t < cutoff) {
      this.buckets.shift();
    }
  }

  /**
   * rate over the last `windowMs` milliseconds
   *
   * @param windowMs - The time window in milliseconds to calculate the rate over.
   * @returns The average rate of events per second over the specified time window.
   */
  rate(windowMs: number): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    let sum = 0;
    for (let i = this.buckets.length - 1; i >= 0; i -= 1) {
      const b = this.buckets[i];
      if (b.t < cutoff) break;
      sum += b.n;
    }
    return sum / (windowMs / 1000);
  }
}
