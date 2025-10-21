/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addDays } from 'date-fns';

// ---- Imports under test (after mocks) --------------------------------------
import {
  getBoundsFromConsentFilter,
  findEarliestDayWithData,
  findLatestDayWithData,
} from '../discoverConsentWindow';
import type { PreferencesQueryFilter } from '../types';
import type { Got } from 'got';
import { startOfUtcDay } from '../../helpers';

// ---- Hoisted controls for mocks --------------------------------------------
const H = vi.hoisted(() => ({
  // Synthetic dataset window (instants)
  dataset: {
    earliest: new Date('2024-01-15T00:00:00.000Z'),
    newest: new Date('2024-02-20T12:34:56.000Z'),
  },
  // Toggle to simulate "no records at all"
  noRecords: false,
  // Mode resolution for the pickConsentChunkMode mock
  mode: 'timestamp' as 'timestamp' | 'updated',
}));

// ---- Mocks -----------------------------------------------------------------
vi.mock('../../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../pickConsentChunkMode', () => ({
  pickConsentChunkMode: vi.fn(() => H.mode),
}));

vi.mock('../getComparisonTimeForRecord', () => ({
  getComparisonTimeForRecord: vi.fn(
    (_mode: 'timestamp' | 'updated', item: any) =>
      // Our mock items carry a .t: Date
      item.t as Date,
  ),
}));

// iterateConsentPages is used by fetchOne() to probe for data before a bound.
// We implement a generator that yields either a single-item page (hit)
// or an empty page (miss). When "noRecords" is true, always miss.
vi.mock('../iterateConsentPages', () => ({
  // eslint-disable-next-line func-names
  iterateConsentPages: vi.fn(async function* (
    _sombra: any,
    _partition: string,
    filter: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pageSize: number,
  ) {
    if (H.noRecords) {
      // No data at all
      yield [];
      return;
    }

    // Extract the relevant *Before bound based on dimension
    const beforeISO =
      filter?.timestampBefore ?? filter?.system?.updatedBefore ?? undefined;

    const earliest = H.dataset.earliest.getTime();
    const newest = H.dataset.newest.getTime();

    // If no before bound, we simulate "newest record" probe and return a hit
    if (!beforeISO) {
      yield [{ t: new Date(newest) }];
      return;
    }

    const before = new Date(beforeISO).getTime();

    // Model: there is data for instants in (earliest, +Infinity).
    // A probe asks: "is there at least one record strictly before <before>?"
    const hasDataBefore = before > earliest;

    if (!hasDataBefore) {
      // Empty region up to/at earliest → miss
      yield [];
      return;
    }

    // Hit: return a record with time = min(newest, before - 1ms)
    const hitT = new Date(Math.min(newest, before - 1));
    yield [{ t: hitT }];
  }),
}));

// Dummy sombra instance; never used by our mocks
const sombra = {} as unknown as Got;

describe('discoverConsentWindow helpers', () => {
  beforeEach(() => {
    // Reset hoisted controls before each test
    H.dataset.earliest = new Date('2024-01-15T00:00:00.000Z');
    H.dataset.newest = new Date('2024-02-20T12:34:56.000Z');
    H.noRecords = false;
    H.mode = 'timestamp';
  });

  // --------------------------------------------------------------------------
  // getBoundsFromConsentFilter
  // --------------------------------------------------------------------------
  describe('getBoundsFromConsentFilter', () => {
    it('extracts timestamp bounds when mode=timestamp', () => {
      const f: PreferencesQueryFilter = {
        timestampAfter: '2024-01-10T00:00:00.000Z',
        timestampBefore: '2024-02-01T00:00:00.000Z',
      };
      const out = getBoundsFromConsentFilter('timestamp', f);
      expect(out.after?.toISOString()).toBe('2024-01-10T00:00:00.000Z');
      expect(out.before?.toISOString()).toBe('2024-02-01T00:00:00.000Z');
    });

    it('extracts updated bounds when mode=updated', () => {
      const f: PreferencesQueryFilter = {
        system: {
          updatedAfter: '2024-01-05T00:00:00.000Z',
          updatedBefore: '2024-03-01T00:00:00.000Z',
        },
      };
      const out = getBoundsFromConsentFilter('updated', f);
      expect(out.after?.toISOString()).toBe('2024-01-05T00:00:00.000Z');
      expect(out.before?.toISOString()).toBe('2024-03-01T00:00:00.000Z');
    });

    it('returns undefineds when no bounds present', () => {
      const outTs = getBoundsFromConsentFilter('timestamp', {});
      const outUpd = getBoundsFromConsentFilter('updated', {});
      expect(outTs.after).toBeUndefined();
      expect(outTs.before).toBeUndefined();
      expect(outUpd.after).toBeUndefined();
      expect(outUpd.before).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // findEarliestDayWithData
  // --------------------------------------------------------------------------
  describe('findEarliestDayWithData', () => {
    it('returns start of today when there are no records at all', async () => {
      H.noRecords = true;

      const earliest = await findEarliestDayWithData(sombra, {
        partition: 'p',
        mode: 'timestamp',
        baseFilter: {},
        maxLookbackDays: 3650,
      });

      const expected = startOfUtcDay(new Date());
      expect(earliest.toISOString()).toBe(expected.toISOString());
    });

    it('finds the earliest UTC day for timestamp mode', async () => {
      // Dataset defined by H: data exists after 2024-01-15T00:00:00Z
      H.mode = 'timestamp';

      const earliest = await findEarliestDayWithData(sombra, {
        partition: 'p',
        mode: 'timestamp',
        baseFilter: {},
        maxLookbackDays: 3650,
      });

      expect(earliest.toISOString()).toBe(
        startOfUtcDay(H.dataset.earliest).toISOString(),
      );
    });

    it('finds the earliest UTC day for updated mode', async () => {
      // Same dataset but using the "updated" dimension
      H.mode = 'updated';

      const earliest = await findEarliestDayWithData(sombra, {
        partition: 'p',
        mode: 'updated',
        baseFilter: { system: {} },
        maxLookbackDays: 3650,
      });

      expect(earliest.toISOString()).toBe(
        startOfUtcDay(H.dataset.earliest).toISOString(),
      );
    });

    it(
      'honors a tight lookback cap by anchoring near the most ' +
        'recent day when the cap is exceeded immediately',
      async () => {
        // Make newest = "now" so that a 1-day probe exceeds a 0-day cap deterministically.
        H.dataset.newest = new Date();
        H.mode = 'timestamp';

        const earliest = await findEarliestDayWithData(sombra, {
          partition: 'p',
          mode: 'timestamp',
          baseFilter: {},
          maxLookbackDays: 0, // force immediate exceed on the first 1d probe
        });

        const today = startOfUtcDay(new Date()).toISOString();
        const yesterday = startOfUtcDay(addDays(new Date(), -1)).toISOString();
        const iso = earliest.toISOString();

        // The resolved earliest day must be between yesterday and today inclusive.
        expect(iso >= yesterday && iso <= today).toBe(true);
      },
    );
  });

  // --------------------------------------------------------------------------
  // findLatestDayWithData
  // --------------------------------------------------------------------------
  describe('findLatestDayWithData', () => {
    it('returns start of today when no records are found (defensive path)', async () => {
      H.noRecords = true;

      const latest = await findLatestDayWithData(sombra, {
        partition: 'p',
        mode: 'timestamp',
        baseFilter: {},
        earliest: new Date('2020-01-01T00:00:00.000Z'),
      });

      const expected = startOfUtcDay(new Date());
      expect(latest.toISOString()).toBe(expected.toISOString());
    });

    it('resolves latest day from the newest record (timestamp mode)', async () => {
      H.mode = 'timestamp';

      const latest = await findLatestDayWithData(sombra, {
        partition: 'p',
        mode: 'timestamp',
        baseFilter: {},
        earliest: H.dataset.earliest,
      });

      expect(latest.toISOString()).toBe(
        startOfUtcDay(H.dataset.newest).toISOString(),
      );
    });

    it('resolves latest day from the newest record (updated mode)', async () => {
      H.mode = 'updated';

      const latest = await findLatestDayWithData(sombra, {
        partition: 'p',
        mode: 'updated',
        baseFilter: { system: {} },
        earliest: H.dataset.earliest,
      });

      expect(latest.toISOString()).toBe(
        startOfUtcDay(H.dataset.newest).toISOString(),
      );
    });
  });
});
/* eslint-enabke @typescript-eslint/no-explicit-any */
