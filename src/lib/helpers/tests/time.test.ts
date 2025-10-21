import { describe, it, expect } from 'vitest';

import {
  DAY_MS,
  HOUR_MS,
  clampPageSize,
  startOfUtcDay,
  startOfHour,
  addMs,
  addDaysUtc,
} from '../time';

describe('helpers', () => {
  describe('constants', () => {
    it('DAY_MS and HOUR_MS are correct', () => {
      expect(HOUR_MS).toBe(60 * 60 * 1000);
      expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
      expect(DAY_MS).toBe(24 * HOUR_MS);
    });
  });

  describe('clampPageSize', () => {
    it('defaults to 50 when undefined', () => {
      expect(clampPageSize(undefined)).toBe(50);
    });
    it('clamps lower bound at 1', () => {
      expect(clampPageSize(0)).toBe(1);
      expect(clampPageSize(-5)).toBe(1);
      expect(clampPageSize(1)).toBe(1);
    });
    it('allows values within [1,50]', () => {
      expect(clampPageSize(7)).toBe(7);
      expect(clampPageSize(25)).toBe(25);
      expect(clampPageSize(50)).toBe(50);
    });
    it('clamps upper bound at 50', () => {
      expect(clampPageSize(51)).toBe(50);
      expect(clampPageSize(1_000)).toBe(50);
    });
  });

  describe('startOfUtcDay', () => {
    it('returns true UTC midnight for a given date', () => {
      const d = new Date('2025-05-10T15:34:56.789Z');
      const out = startOfUtcDay(d);
      expect(out.toISOString()).toBe('2025-05-10T00:00:00.000Z');
    });

    it('is idempotent at midnight', () => {
      const d = new Date('2025-01-01T00:00:00.000Z');
      const out = startOfUtcDay(d);
      expect(out.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    it('does not mutate the input Date', () => {
      const src = new Date('2025-08-20T23:59:59.999Z');
      const srcMillis = src.getTime();
      startOfUtcDay(src);
      expect(src.getTime()).toBe(srcMillis);
    });
  });

  describe('startOfHour', () => {
    it('returns true UTC hour start for a given date', () => {
      const d = new Date('2025-05-10T15:34:56.789Z');
      const out = startOfHour(d);
      expect(out.toISOString()).toBe('2025-05-10T15:00:00.000Z');
    });

    it('is idempotent on an exact hour', () => {
      const d = new Date('2025-11-02T07:00:00.000Z');
      const out = startOfHour(d);
      expect(out.toISOString()).toBe('2025-11-02T07:00:00.000Z');
    });

    it('does not mutate the input Date', () => {
      const src = new Date('2025-03-09T01:59:59.999Z');
      const millis = src.getTime();
      startOfHour(src);
      expect(src.getTime()).toBe(millis);
    });
  });

  describe('addMs', () => {
    it('adds milliseconds without mutating original', () => {
      const d = new Date('2025-06-01T00:00:00.000Z');
      const out = addMs(d, 1234);
      expect(out.toISOString()).toBe('2025-06-01T00:00:01.234Z');
      expect(d.toISOString()).toBe('2025-06-01T00:00:00.000Z');
    });

    it('handles negative increments (same day)', () => {
      const d = new Date('2025-06-01T00:00:00.500Z');
      const out = addMs(d, -500);
      expect(out.toISOString()).toBe('2025-06-01T00:00:00.000Z');
    });

    it('handles negative increments across day boundary', () => {
      const d = new Date('2025-06-01T00:00:00.000Z');
      const out = addMs(d, -1);
      expect(out.toISOString()).toBe('2025-05-31T23:59:59.999Z');
    });
  });

  describe('addDaysUtc', () => {
    it('adds whole days in UTC (no local DST surprises)', () => {
      const d = new Date('2025-03-09T08:00:00.000Z'); // US DST boundary day; UTC-safe
      const out1 = addDaysUtc(d, 1);
      const out2 = addDaysUtc(d, -1);
      expect(out1.toISOString()).toBe('2025-03-10T08:00:00.000Z');
      expect(out2.toISOString()).toBe('2025-03-08T08:00:00.000Z');
    });

    it('crosses month boundaries correctly', () => {
      const d = new Date('2025-01-31T00:00:00.000Z');
      const out = addDaysUtc(d, 1);
      expect(out.toISOString()).toBe('2025-02-01T00:00:00.000Z');
    });

    it('does not mutate the input Date', () => {
      const d = new Date('2025-12-31T12:34:56.000Z');
      const millis = d.getTime();
      addDaysUtc(d, 2);
      expect(d.getTime()).toBe(millis);
    });
  });
});
