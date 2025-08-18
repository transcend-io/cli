import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateCounter } from '../RateCounter';

describe('RateCounter', () => {
  const T0 = 1_700_000_000_000; // fixed epoch for deterministic Date.now()

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Sanity: empty counter yields zero rate for any window.
   */
  it('returns 0 rate when no buckets exist', () => {
    const rc = new RateCounter();
    expect(rc.rate(60_000)).toBe(0);
    expect(rc.rate(10_000)).toBe(0);
    expect(rc.rate(120_000)).toBe(0);
  });

  /**
   * Adds three buckets at T0, T0+30s, T0+70s and queries rate over the last 60s
   * at T0+70s. The first bucket is outside the 60s window, so only the latter
   * two are included.
   *
   * Sum = 20 + 30 = 50; Window = 60s → 50/60 ≈ 0.8333
   */
  it('computes rate over a window including only recent buckets', () => {
    const rc = new RateCounter();

    // at T0
    vi.setSystemTime(T0);
    rc.add(10);

    // at T0 + 30s
    vi.setSystemTime(T0 + 30_000);
    rc.add(20);

    // at T0 + 70s
    vi.setSystemTime(T0 + 70_000);
    rc.add(30);

    // rate over last 60s at now = T0 + 70s → includes +30s and +70s buckets
    const r = rc.rate(60_000);
    expect(r).toBeCloseTo(50 / 60, 6);
  });

  /**
   * Boundary behavior: a bucket exactly at the cutoff time (now - windowMs)
   * should be included (code excludes only when b.t < cutoff).
   *
   * At T0 add 10, then at T0+60s compute a 60s window → includes the T0 bucket.
   * Rate = 10 / 60.
   */
  it('includes a bucket exactly at the cutoff boundary', () => {
    const rc = new RateCounter();

    vi.setSystemTime(T0);
    rc.add(10);

    vi.setSystemTime(T0 + 60_000);
    const r = rc.rate(60_000);
    expect(r).toBeCloseTo(10 / 60, 6);
  });

  /**
   * Pruning behavior: add a bucket, move time forward > 120s, then add another
   * bucket. The first bucket should be pruned during the second `.add()`.
   *
   * We then compute rate over a large window (10 minutes) so that if pruning
   * did NOT happen, the old bucket would have been counted. Expected sum is
   * only the second bucket.
   */
  it('prunes buckets older than 120s on add()', () => {
    const rc = new RateCounter();

    // First bucket at T0
    vi.setSystemTime(T0);
    rc.add(100);

    // Advance past 120s window, second add triggers pruning of the first
    vi.setSystemTime(T0 + 150_000);
    rc.add(50);

    // Large window (600s): if pruning failed, sum would be 150; correct sum = 50
    const r = rc.rate(600_000);
    expect(r).toBeCloseTo(50 / 600, 6);
  });
});
