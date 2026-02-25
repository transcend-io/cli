/* eslint-disable @typescript-eslint/no-explicit-any,require-await,max-lines */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Got } from 'got';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

import { fetchConsentPreferencesChunked } from '../fetchConsentPreferencesChunked';

// ---- Hoisted shared fakes / captors ----------------------------------------
const H = vi.hoisted(() => ({
  // logger
  loggerSpies: { info: vi.fn(), warn: vi.fn() },

  // colors passthrough
  colors: {
    magenta: (s: string) => s,
    green: (s: string) => s,
  },

  // progress bar spy
  bar: {
    start: vi.fn(),
    update: vi.fn(),
    stop: vi.fn(),
  },

  // helpers
  clampPageSize: vi.fn((n: number) => Math.max(1, Math.min(50, n))),
  addDaysUtc: vi.fn(
    (d: Date, n: number) => new Date(d.getTime() + n * 86400000),
  ),

  // discovery
  getBoundsFromConsentFilter: vi.fn(),
  findEarliestDayWithData: vi.fn(),
  findLatestDayWithData: vi.fn(),

  // chunking
  buildConsentChunks: vi.fn(),

  // paging
  iterateCalls: [] as Array<{
    /** Partition */
    partition: string;
    /** Filter */
    filter: any;
    /** Page size */
    pageSize: number;
  }>,
  // Each call to iterateConsentPages will shift one generator from here:
  iterators: [] as Array<
    AsyncGenerator<PreferenceQueryResponseItem[], void, unknown>
  >,
  makeIter: (pages: PreferenceQueryResponseItem[][]) =>
    // eslint-disable-next-line wrap-iife, func-names
    (async function* () {
      for (const p of pages) yield p;
    })(),

  // mode picker
  pickConsentChunkMode: vi.fn(),
}));

// ---- Mocks BEFORE importing SUT --------------------------------------------
vi.mock('../../../logger', () => ({ logger: H.loggerSpies }));

vi.mock('colors', () => ({
  default: H.colors,
  magenta: H.colors.magenta,
  green: H.colors.green,
}));

vi.mock('cli-progress', () => {
  const SingleBar = vi.fn().mockImplementation(() => H.bar); // <— return H.bar itself
  const Presets = { shades_classic: {} };

  const def = { SingleBar, Presets };
  return {
    default: def, // supports `import cliProgress from 'cli-progress'`
    SingleBar,
    Presets,
  };
});

vi.mock('../../bluebird', () => ({
  // Use deterministic Promise.all behavior
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  map: (arr: any[], fn: (x: any) => Promise<unknown>, _opts?: any) =>
    Promise.all(arr.map(fn)),
}));

vi.mock('../../helpers', () => ({
  clampPageSize: (n: number) => H.clampPageSize(n),
  addDaysUtc: (d: Date, n: number) => H.addDaysUtc(d, n),
}));

vi.mock('../discoverConsentWindow', () => ({
  getBoundsFromConsentFilter: (...args: any[]) =>
    H.getBoundsFromConsentFilter(...args),
  findEarliestDayWithData: (...args: any[]) =>
    H.findEarliestDayWithData(...args),
  findLatestDayWithData: (...args: any[]) => H.findLatestDayWithData(...args),
}));

vi.mock('../buildConsentChunks', () => ({
  buildConsentChunks: (...args: any[]) => H.buildConsentChunks(...args),
}));

vi.mock('../iterateConsentPages', () => ({
  /**
   * Iterator spy
   *
   * @param _sombra - Sombra instance
   * @param partition - Partition
   * @param filter - Filter
   * @param pageSize - Page size
   * @yields Async generator
   */
  async *iterateConsentPages(
    _sombra: Got,
    partition: string,
    filter: any,
    pageSize: number,
  ) {
    H.iterateCalls.push({ partition, filter, pageSize });
    const it = H.iterators.shift();
    /* istanbul ignore next */
    if (!it) {
      // default empty generator
      return;
    }
    for await (const page of it) {
      yield page;
    }
  },
}));

vi.mock('../pickConsentChunkMode', () => ({
  pickConsentChunkMode: (...args: any[]) => H.pickConsentChunkMode(...args),
}));

// ---- Helpers ---------------------------------------------------------------
/**
 * Make a minimal PreferenceQueryResponseItem for tests
 *
 * @param partition - Partition
 * @param ts - Timestamp
 * @returns Item
 */
function makeItem(partition: string, ts: string): PreferenceQueryResponseItem {
  return {
    // minimal shape for tests
    partition,
    timestamp: ts,
    system: { updatedAt: ts },
  } as unknown as PreferenceQueryResponseItem;
}

describe('fetchConsentPreferencesChunked', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // ✅ Recreate H.bar as a fresh object so no stale/wiped functions linger
    (H as any).bar = {
      start: vi.fn(),
      update: vi.fn(),
      stop: vi.fn(),
    };

    H.iterateCalls.length = 0;
    H.iterators.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it(
    'aggregates across chunks when onItems is not provided (timestamp mode), ' +
      'clamps page size, and merges filter correctly',
    async () => {
      const partition = 'pA';
      const baseFilter = { system: { updatedAfter: '2025-01-01' } }; // should be removed in timestamp mode
      const after = new Date('2025-01-10T00:00:00.000Z');
      const before = new Date('2025-01-12T00:00:00.000Z');

      // Mode
      H.pickConsentChunkMode.mockReturnValue('timestamp');

      // Bounds returned directly (no discovery)
      H.getBoundsFromConsentFilter.mockReturnValue({ after, before });

      // Two chunks: [10->11), [11->12)
      const w1 = {
        timestampAfter: new Date('2025-01-10T00:00:00.000Z'),
        timestampBefore: new Date('2025-01-11T00:00:00.000Z'),
      };
      const w2 = {
        timestampAfter: new Date('2025-01-11T00:00:00.000Z'),
        timestampBefore: new Date('2025-01-12T00:00:00.000Z'),
      };
      H.buildConsentChunks.mockReturnValue([w1, w2]);

      // Page streams per chunk
      H.iterators.push(
        H.makeIter([[makeItem(partition, '2025-01-10T00:00:00.000Z')]]),
        H.makeIter([
          [makeItem(partition, '2025-01-11T00:00:00.000Z')],
          [makeItem(partition, '2025-01-11T12:00:00.000Z')],
        ]),
      );

      // pageSize clamp: supply large limit
      const limit = 999;

      const sombra = { post: vi.fn() } as unknown as Got;
      const out = await fetchConsentPreferencesChunked(sombra, {
        partition,
        filterBy: baseFilter as any,
        limit,
        windowConcurrency: 5,
        maxChunks: 10,
        maxLookbackDays: 3650,
      });

      // Aggregated 3 items
      expect(out).toHaveLength(3);
      expect(out.map((r) => r.timestamp)).toEqual([
        '2025-01-10T00:00:00.000Z',
        '2025-01-11T00:00:00.000Z',
        '2025-01-11T12:00:00.000Z',
      ]);

      // clampPageSize used
      expect(H.clampPageSize).toHaveBeenCalledWith(limit);

      // iterateConsentPages called once per chunk with merged filters
      expect(H.iterateCalls).toHaveLength(2);
      const [call1, call2] = H.iterateCalls;

      // correct partition
      expect(call1.partition).toBe(partition);
      expect(call2.partition).toBe(partition);

      // timestamp mode => system removed, timestamp bounds applied
      expect(call1.filter.system).toBeUndefined();
      expect(call1.filter.timestampAfter).toEqual(w1.timestampAfter);
      expect(call1.filter.timestampBefore).toEqual(w1.timestampBefore);

      expect(call2.filter.system).toBeUndefined();
      expect(call2.filter.timestampAfter).toEqual(w2.timestampAfter);
      expect(call2.filter.timestampBefore).toEqual(w2.timestampBefore);

      // progress bar lifecycle
      expect(H.bar.start).toHaveBeenCalledTimes(1);
      expect(H.bar.update).toHaveBeenCalled(); // at least once
      expect(H.bar.stop).toHaveBeenCalledTimes(1);
    },
  );

  it('streams via onItems (no accumulation) and delivers pages across chunks', async () => {
    const partition = 'pStream';
    const after = new Date('2025-02-01T00:00:00.000Z');
    const before = new Date('2025-02-02T00:00:00.000Z');

    H.pickConsentChunkMode.mockReturnValue('timestamp');
    H.getBoundsFromConsentFilter.mockReturnValue({ after, before });

    const w = { timestampAfter: after, timestampBefore: before };
    H.buildConsentChunks.mockReturnValue([w]);

    // One chunk, two pages
    const pg1 = [makeItem(partition, '2025-02-01T00:00:00.000Z')];
    const pg2 = [makeItem(partition, '2025-02-01T12:00:00.000Z')];
    H.iterators.push(H.makeIter([pg1, pg2]));

    const sombra = { post: vi.fn() } as unknown as Got;
    const delivered: PreferenceQueryResponseItem[][] = [];
    const out = await fetchConsentPreferencesChunked(sombra, {
      partition,
      filterBy: {},
      limit: 25,
      onItems: async (items) => delivered.push(items),
    });

    // No accumulation when onItems is provided
    expect(out).toEqual([]);
    // Both pages delivered
    expect(delivered).toHaveLength(2);
    expect(delivered[0]).toEqual(pg1);
    expect(delivered[1]).toEqual(pg2);
  });

  it(
    'discovers bounds when missing (updated mode), then builds chunks and merges ' +
      'system.updated* while clearing timestamp*',
    async () => {
      const partition = 'pDisc';
      const earliest = new Date('2025-03-10T00:00:00.000Z');
      const latestDay = new Date('2025-03-15T00:00:00.000Z');
      const latestPlus1 = new Date('2025-03-16T00:00:00.000Z');

      H.pickConsentChunkMode.mockReturnValue('updated');

      // No bounds initially
      H.getBoundsFromConsentFilter.mockReturnValue({
        after: undefined,
        before: undefined,
      });

      // Discovery returns earliest and latest (with +1 day applied)
      H.findEarliestDayWithData.mockResolvedValue(earliest);
      H.findLatestDayWithData.mockResolvedValue(latestDay);
      H.addDaysUtc.mockReturnValue(latestPlus1);

      // Build a single window in updated mode
      const wUpd = {
        system: { updatedAfter: earliest, updatedBefore: latestPlus1 },
      };
      H.buildConsentChunks.mockReturnValue([wUpd]);

      // Single page
      const pg = [makeItem(partition, '2025-03-12T00:00:00.000Z')];
      H.iterators.push(H.makeIter([pg]));

      const sombra = { post: vi.fn() } as unknown as Got;

      const out = await fetchConsentPreferencesChunked(sombra, {
        partition,
        filterBy: { timestampAfter: 'SHOULD_BE_REMOVED' } as any, // ensure timestamp* is cleared in updated mode
        limit: 15,
        maxLookbackDays: 99,
      });

      // Aggregated
      expect(out).toHaveLength(1);
      expect(out[0].timestamp).toBe('2025-03-12T00:00:00.000Z');

      // Discovery used
      expect(H.findEarliestDayWithData).toHaveBeenCalledTimes(1);
      expect(H.findLatestDayWithData).toHaveBeenCalledTimes(1);
      expect(H.addDaysUtc).toHaveBeenCalledWith(latestDay, 1);

      // Build window from discovered bounds
      expect(H.buildConsentChunks).toHaveBeenCalledWith(
        'updated',
        earliest,
        latestPlus1,
        expect.any(Number),
      );

      // iterateConsentPages received correct merged filter:
      // - timestampAfter/Before cleared
      // - system.updatedAfter/Before set from window
      expect(H.iterateCalls).toHaveLength(1);
      const f = H.iterateCalls[0].filter;
      expect(f.timestampAfter).toBeUndefined();
      expect(f.timestampBefore).toBeUndefined();
      expect(f.system?.updatedAfter).toEqual(earliest);
      expect(f.system?.updatedBefore).toEqual(latestPlus1);
    },
  );
});
/* eslint-enable @typescript-eslint/no-explicit-any,require-await,max-lines */
