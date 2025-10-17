import { describe, it, expect } from 'vitest';

import {
  uuidParser,
  urlParser,
  arrayParser,
  dateParser,
  parseDurationToMs,
} from '../parsers';

describe('parsers', () => {
  describe('uuidParser', () => {
    it('accepts a valid UUID (v1–v5)', () => {
      const good = '123e4567-e89b-12d3-a456-426614174000';
      expect(uuidParser(good)).toBe(good);
    });

    it('is case-insensitive', () => {
      const upper = '123E4567-E89B-12D3-A456-426614174000';
      expect(uuidParser(upper)).toBe(upper);
    });

    it('rejects invalid UUIDs', () => {
      const bad = ['not-a-uuid', '123e4567-e89b-02d3-a456-426614174000'];
      for (const v of bad) {
        expect(() => uuidParser(v)).toThrowError(/Invalid UUID format/);
      }
    });
  });

  describe('urlParser', () => {
    it('normalizes and strips a trailing slash from origin', () => {
      expect(urlParser('https://example.com/')).toBe('https://example.com');
    });

    it('preserves path/query/hash; only removes a truly trailing slash', () => {
      const out = urlParser('https://ex.com/foo/bar/?a=1#frag');
      // slash before ? is not "trailing" and should remain
      expect(out).toBe('https://ex.com/foo/bar/?a=1#frag');
    });

    it('rejects invalid URLs', () => {
      expect(() => urlParser('not a url')).toThrowError(/Invalid URL format/);
    });
  });

  describe('arrayParser', () => {
    it('splits, trims, and removes empty entries', () => {
      expect(arrayParser('a, b , , c')).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array for an empty string', () => {
      expect(arrayParser('')).toEqual([]);
    });
  });

  describe('dateParser', () => {
    it('parses a valid ISO-8601 date', () => {
      const iso = '2024-01-02T03:04:05.000Z';
      const d = dateParser(iso);
      expect(d.toISOString()).toBe(iso);
    });

    it('rejects invalid dates', () => {
      expect(() => dateParser('not-a-date')).toThrowError(/Invalid date/);
    });
  });

  describe('parseDurationToMs', () => {
    it('treats numbers as seconds (backward-compat)', () => {
      expect(parseDurationToMs(2)).toBe(2000);
      expect(parseDurationToMs(2.5)).toBe(2500);
      expect(parseDurationToMs(0)).toBe(0);
    });

    it('treats bare numeric strings as seconds', () => {
      expect(parseDurationToMs('300')).toBe(300_000);
      expect(parseDurationToMs('  300  ')).toBe(300_000);
      expect(parseDurationToMs('0')).toBe(0);
    });

    it('parses human-friendly strings via ms()', () => {
      expect(parseDurationToMs('2d')).toBe(172_800_000);
      expect(parseDurationToMs('90 minutes')).toBe(5_400_000);
      // ms defines 1 year as 365.25 days
      expect(parseDurationToMs('1y')).toBe(31_557_600_000);
      expect(parseDurationToMs('-1h')).toBe(-3_600_000);
    });

    it('rejects invalid strings', () => {
      for (const v of ['abc', '', 'ten minutes']) {
        expect(() => parseDurationToMs(v)).toThrowError(/Invalid duration/);
      }
    });
  });
});
