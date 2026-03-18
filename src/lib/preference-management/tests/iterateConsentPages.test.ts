/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Got } from 'got';

import { iterateConsentPages } from '../iterateConsentPages';
import type { PreferencesQueryFilter } from '../types';

// ---- Hoisted shared state so all mocks & SUT see the same data --------------
const H = vi.hoisted(() => {
  /**
   * pages to return via decodeCodec, one per call
   */
  type Page = {
    /** Nodes */
    nodes: unknown[];
    /** Cursor */
    cursor?: string;
  };
  const pages: Page[] = [];

  // last retry options captured from withPreferenceRetry
  let lastRetryOpts: {
    /** On retry */
    onRetry?: (attempt: number, error: unknown, message: string) => void;
  } | null = null;

  // capture each POST call payload
  const postCalls: Array<{
    /** URL */
    url: string;
    /** Body */
    body: any;
  }> = [];

  // simple logger stub
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
  const colors = { yellow: (s: string) => s };

  // sombra stub that records calls and returns a .json()able object
  const makeSombra = (): Got =>
    ({
      post: vi.fn(
        (
          url: string,
          opts: {
            /** JSON */
            json: any;
          },
        ) => {
          postCalls.push({ url, body: opts.json });
          return {
            // eslint-disable-next-line require-await
            json: vi.fn(async () => ({ raw: true })), // raw payload not used by decodeCodec in our tests
          };
        },
      ),
    } as unknown as Got);

  return {
    pages,
    pushPage: (p: Page) => pages.push(p),
    resetPages: () => {
      pages.length = 0;
    },
    shiftPage: () => pages.shift() ?? { nodes: [] },

    lastRetryOpts,
    setLastRetryOpts: (o: typeof lastRetryOpts) => {
      lastRetryOpts = o;
    },
    getLastRetryOpts: () => lastRetryOpts,

    postCalls,
    resetPostCalls: () => {
      postCalls.length = 0;
    },

    logger,
    colors,
    makeSombra,
  };
});

// ----------------------------- Mocks (hoisted) --------------------------------
vi.mock('../../../logger', () => ({ logger: H.logger }));

vi.mock('colors', () => ({
  __esModule: true,
  default: H.colors,
  ...H.colors,
}));

// Make withPreferenceRetry just call the fn once, and capture retry opts.
vi.mock('../withPreferenceRetry', () => ({
  __esModule: true,
  withPreferenceRetry: vi.fn(
    async (
      name: string,
      fn: () => Promise<unknown>,
      opts: {
        /** On retry */
        onRetry?: (attempt: number, error: unknown, message: string) => void;
      },
      // eslint-disable-next-line require-await
    ) => {
      H.setLastRetryOpts(opts);
      return fn();
    },
  ),
}));

// decodeCodec returns the next page from our queue each time SUT calls it
vi.mock('@transcend-io/type-utils', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decodeCodec: vi.fn((_codec: unknown, _resp: unknown) => H.shiftPage()),
}));

describe('iterateConsentPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.resetPages();
    H.resetPostCalls();
    H.setLastRetryOpts(null);
  });

  it('paginates through cursors, yielding each page and sending correct bodies', async () => {
    // Arrange 3 pages: two with cursors, final without cursor
    const item = (
      id: number,
    ): {
      /** ID */
      id: number;
    } => ({ id } as any);
    H.pushPage({ nodes: [item(1), item(2)], cursor: 'c1' });
    H.pushPage({ nodes: [item(3)], cursor: 'c2' });
    H.pushPage({ nodes: [item(4), item(5)] }); // no cursor => stop after yield

    const sombra = H.makeSombra();
    const filter: PreferencesQueryFilter = {
      timestampAfter: '2025-01-01T00:00:00.000Z',
      timestampBefore: '2025-01-02T00:00:00.000Z',
    };

    const out: any[] = [];
    for await (const page of iterateConsentPages(
      sombra,
      'part-1',
      filter,
      250,
    )) {
      out.push(page.map((r: any) => r.id));
    }

    // yielded all pages in order
    expect(out).toEqual([[1, 2], [3], [4, 5]]);

    // three POSTs were made
    expect(H.postCalls).toHaveLength(3);

    // First call: no cursor
    expect(H.postCalls[0].url).toBe('v1/preferences/part-1/query');
    expect(H.postCalls[0].body).toEqual({
      limit: 250,
      filter,
    });

    // Second call includes cursor "c1"
    expect(H.postCalls[1].body).toEqual({
      limit: 250,
      filter,
      cursor: 'c1',
    });

    // Third call includes cursor "c2"
    expect(H.postCalls[2].body).toEqual({
      limit: 250,
      filter,
      cursor: 'c2',
    });
  });

  it('stops immediately when first page returns no nodes', async () => {
    H.pushPage({ nodes: [] }); // first decode result empty => no yields

    const sombra = H.makeSombra();
    const out: any[] = [];
    for await (const page of iterateConsentPages(sombra, 'p-empty', {}, 10)) {
      out.push(page);
    }

    expect(out).toEqual([]);
    // still did a single probe call
    expect(H.postCalls).toHaveLength(1);
    expect(H.postCalls[0].body).toEqual({ limit: 10 });
  });

  it('exposes onRetry hook that logs a warning message', async () => {
    // Provide a single non-empty page so the generator runs once
    H.pushPage({ nodes: [{ id: 'x' }], cursor: undefined });

    const sombra = H.makeSombra();
    const it = iterateConsentPages(sombra, 'p-retry', {}, 5);

    // Advance one step to ensure request was made and retry opts captured
    await it.next();

    const opts = H.getLastRetryOpts();
    expect(opts && typeof opts.onRetry).toBe('function');

    // Simulate a retry event
    opts?.onRetry?.(3, new Error('boom'), 'boom');

    expect(H.logger.warn).toHaveBeenCalledTimes(1);
    const msg = H.logger.warn.mock.calls[0][0] as string;
    expect(msg).toContain(
      'Retry attempt 3 for iterateConsentPages due to error: boom',
    );
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
