/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars,require-await */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Got } from 'got';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

// Import SUT after mocks
import { fetchConsentPreferences } from '../fetchConsentPreferences';
import { ConsentPreferenceResponse } from '../types';

// Hoisted shared spies / fakes
const H = vi.hoisted(() => ({
  loggerSpies: {
    warn: vi.fn(),
  },
  // decodeCodec pass-through
  decodeCodec: vi.fn((_codec: unknown, raw: any) => raw),
  // colors passthrough
  colors: {
    yellow: (s: string) => s,
  },
  // track wrapper usage
  withRetrySpy: vi.fn(async (fn: () => Promise<any>, _opts?: any) => fn()),
}));

/** Mock external deps BEFORE SUT import */
vi.mock('../../../logger', () => ({
  logger: H.loggerSpies,
}));

vi.mock('@transcend-io/type-utils', () => ({
  decodeCodec: (codec: unknown, raw: unknown) => H.decodeCodec(codec, raw),
}));

vi.mock('colors', () => ({
  default: H.colors,
  yellow: H.colors.yellow,
}));

vi.mock('../withPreferenceRetry', () => ({
  withPreferenceRetry: (fn: unknown, opts?: unknown) =>
    // @ts-expect-error test-only
    H.withRetrySpy(fn, opts),
}));

describe('fetchConsentPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('paginates with cursor, aggregates nodes (no onItems), and includes filter on every call', async () => {
    const partition = 'p-part';
    const filterBy = { system: { updatedAfter: '2025-01-01T00:00:00.000Z' } };
    const page1Nodes: PreferenceQueryResponseItem[] = [
      {
        partition,
        timestamp: '2025-01-02T00:00:00.000Z',
        system: { updatedAt: '2025-01-02T00:00:00.000Z' },
      } as unknown as PreferenceQueryResponseItem,
      {
        partition,
        timestamp: '2025-01-02T01:00:00.000Z',
        system: { updatedAt: '2025-01-02T01:00:00.000Z' },
      } as unknown as PreferenceQueryResponseItem,
    ];
    const page2Nodes: PreferenceQueryResponseItem[] = [
      {
        partition,
        timestamp: '2025-01-03T00:00:00.000Z',
        system: { updatedAt: '2025-01-03T00:00:00.000Z' },
      } as unknown as PreferenceQueryResponseItem,
    ];

    // Mock sombra.post(...).json() with two pages then end
    const post = vi.fn(
      (
        url: string,
        {
          json,
        }: {
          /** JSON */
          json: any;
        },
      ) => {
        // simulate first call: no cursor in body -> return cursor "C1"
        if (!json.cursor) {
          expect(url).toBe(`v1/preferences/${partition}/query`);
          expect(json.limit).toBe(50); // default limit clamped
          expect(json.filter).toEqual(filterBy); // filter present on first call
          return {
            json: async () =>
              ({
                nodes: page1Nodes,
                cursor: 'C1',
              } as unknown),
          };
        }
        // second call uses cursor, filter remains (hasFilter=true)
        if (json.cursor === 'C1') {
          expect(json.limit).toBe(50);
          expect(json.filter).toEqual(filterBy); // still present
          return {
            json: async () =>
              ({
                nodes: page2Nodes,
                cursor: 'C2',
              } as unknown),
          };
        }
        // third call returns no cursor (done)
        if (json.cursor === 'C2') {
          return {
            json: async () =>
              ({
                nodes: [],
                cursor: undefined,
              } as unknown),
          };
        }
        throw new Error('Unexpected call');
      },
    );

    const sombra = { post } as unknown as Got;

    const out = await fetchConsentPreferences(sombra, {
      partition,
      filterBy,
      limit: undefined, // use default
    });

    // Aggregated
    expect(out).toHaveLength(3);
    expect(out[0].timestamp).toBe('2025-01-02T00:00:00.000Z');
    expect(out[2].timestamp).toBe('2025-01-03T00:00:00.000Z');

    // decodeCodec used per page
    expect(H.decodeCodec).toHaveBeenCalledTimes(3);
    // called with our codec
    expect(H.decodeCodec.mock.calls[0][0]).toBe(ConsentPreferenceResponse);

    // Wrapper used for each page
    expect(H.withRetrySpy).toHaveBeenCalledTimes(3);
    // The options passed to wrapper include onRetry hook
    const optsArg = H.withRetrySpy.mock.calls[0][1];
    expect(typeof optsArg?.onRetry).toBe('function');
  });

  it('clamps page size to 50 when limit > 50 and stops when nextCursor is falsy', async () => {
    const partition = 'pX';
    const nodes: PreferenceQueryResponseItem[] = [
      {
        partition,
        timestamp: '2025-02-01T00:00:00.000Z',
        system: { updatedAt: '2025-02-01T00:00:00.000Z' },
      } as unknown as PreferenceQueryResponseItem,
    ];
    const post = vi.fn(
      (
        _url: string,
        {
          json,
        }: {
          /** JSON */
          json: any;
        },
      ) => {
        // limit should be clamped to 50 even if limit=999
        expect(json.limit).toBe(50);
        return {
          json: async () =>
            ({
              nodes,
              cursor: undefined, // stop after first page
            } as unknown),
        };
      },
    );
    const sombra = { post } as unknown as Got;

    const out = await fetchConsentPreferences(sombra, {
      partition,
      limit: 999,
    });

    expect(out).toHaveLength(1);
    expect(out[0].partition).toBe(partition);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('omits filter from body when filterBy is empty and breaks on empty nodes', async () => {
    const partition = 'np';
    const post = vi.fn(
      (
        _url: string,
        {
          json,
        }: {
          /** JSON */
          json: any;
        },
      ) => {
        // When filterBy = {}, hasFilter should be false → no "filter" field
        expect('filter' in json).toBe(false);
        return {
          json: async () =>
            ({
              nodes: [],
              cursor: 'IRRELEVANT',
            } as unknown),
        };
      },
    );
    const sombra = { post } as unknown as Got;

    const out = await fetchConsentPreferences(sombra, {
      partition,
      filterBy: {}, // empty
      limit: 10,
    });

    expect(out).toHaveLength(0);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('streams pages to onItems (no aggregation) and still honors filter + cursor flow', async () => {
    const partition = 'p-stream';
    const filterBy = { identifiers: [{ name: 'email', value: 'a@b.com' }] };
    const page1Nodes: PreferenceQueryResponseItem[] = [
      {
        partition,
        timestamp: '2025-03-01T00:00:00.000Z',
        system: { updatedAt: '2025-03-01T00:00:00.000Z' },
      } as unknown as PreferenceQueryResponseItem,
    ];
    const page2Nodes: PreferenceQueryResponseItem[] = [
      {
        partition,
        timestamp: '2025-03-02T00:00:00.000Z',
        system: { updatedAt: '2025-03-02T00:00:00.000Z' },
      } as unknown as PreferenceQueryResponseItem,
    ];

    const delivered: PreferenceQueryResponseItem[][] = [];

    const post = vi.fn(
      (
        url: string,
        {
          json,
        }: {
          /** JSON */
          json: any;
        },
      ) => {
        // first call -> cursor "CX1"
        if (!json.cursor) {
          expect(url).toBe(`v1/preferences/${partition}/query`);
          expect(json.limit).toBe(50);
          expect(json.filter).toEqual(filterBy);
          return {
            json: async () =>
              ({
                nodes: page1Nodes,
                cursor: 'CX1',
              } as unknown),
          };
        }
        // second call -> cursor "CX2"
        if (json.cursor === 'CX1') {
          expect(json.filter).toEqual(filterBy);
          return {
            json: async () =>
              ({
                nodes: page2Nodes,
                cursor: 'CX2',
              } as unknown),
          };
        }
        // final call -> end
        if (json.cursor === 'CX2') {
          return {
            json: async () =>
              ({
                nodes: [],
                cursor: undefined,
              } as unknown),
          };
        }
        throw new Error('Unexpected call');
      },
    );

    const sombra = { post } as unknown as Got;

    const out = await fetchConsentPreferences(sombra, {
      partition,
      filterBy,
      onItems: async (page) => {
        delivered.push(page);
      },
    });

    // In streaming mode, nothing is accumulated
    expect(out).toEqual([]);

    // Pages were delivered in order
    expect(delivered).toHaveLength(2);
    expect(delivered[0]).toEqual(page1Nodes);
    expect(delivered[1]).toEqual(page2Nodes);

    // decodeCodec & wrapper called per page (3 calls including the final empty-page response)
    expect(H.decodeCodec).toHaveBeenCalledTimes(3);
    expect(H.withRetrySpy).toHaveBeenCalledTimes(3);
    expect(H.decodeCodec.mock.calls[0][0]).toBe(ConsentPreferenceResponse);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars,require-await */
