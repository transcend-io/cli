import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Got } from 'got';
import type { PreferencesQueryFilter } from '../types';

import { consentWindowHasAny } from '../consentWindowHasAny';
import { withPreferenceQueryRetry } from '../withPreferenceQueryRetry';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

// --- Hoisted test state so mocks can reference it before SUT import ---------
const H = vi.hoisted(() => {
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };

  // Capture retry opts passed to withPreferenceQueryRetry
  let lastRetryOpts: {
    /** Options for retrying the request */
    onRetry?: (attempt: number, error: unknown, message: string) => void;
  } | null = null;

  // Next raw response returned by sombra.post(...).json()
  let rawResp: unknown = { tag: 'raw' };

  // Capture last sombra.post args (url + body.json)
  const postCalls: Array<{
    /** URL */
    url: string;
    /** Body (this is opts.json -> { limit, filter }) */
    body: unknown;
  }> = [];

  // Fake "colors" passthrough
  const colors = { yellow: (s: string) => s };

  // A tiny sombra stub that records calls and returns rawResp for .json()
  const makeSombra = (): Got =>
    ({
      post: vi.fn(
        (
          url: string,
          opts: {
            /** Request body */
            json: unknown;
          },
        ) => {
          // Store the payload (opts.json) directly.
          postCalls.push({ url, body: opts.json });
          return {
            // eslint-disable-next-line require-await
            json: vi.fn(async () => rawResp),
          };
        },
      ),
    } as unknown as Got);

  return {
    logger,
    lastRetryOpts,
    setLastRetryOpts: (o: typeof lastRetryOpts) => {
      lastRetryOpts = o;
    },
    getLastRetryOpts: () => lastRetryOpts,
    rawResp,
    setRawResp: (v: unknown) => {
      rawResp = v;
    },
    postCalls,
    resetPostCalls: () => {
      postCalls.length = 0;
    },
    colors,
    makeSombra,
  };
});

vi.mock('../../../logger', () => ({ logger: H.logger }));

vi.mock('colors', () => ({
  __esModule: true,
  default: H.colors,
  ...H.colors,
}));

vi.mock('../withPreferenceQueryRetry', () => ({
  __esModule: true,
  withPreferenceQueryRetry: vi.fn(
    async (
      fn: () => Promise<unknown>,
      opts: {
        /** On retry */
        onRetry?: (attempt: number, error: unknown, message: string) => void;
      },
      // eslint-disable-next-line require-await
    ) => {
      H.setLastRetryOpts(opts);
      // In normal path, just call the function once without actually retrying.
      return fn();
    },
  ),
}));

describe('consentWindowHasAny', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.resetPostCalls();
    H.setLastRetryOpts(null);
    H.setRawResp({ nodes: [] });
  });

  it('should throw codec error', async () => {
    const sombra = H.makeSombra();
    const base: PreferencesQueryFilter = {
      identifiers: [{ name: 'email', value: 'a@b.com' }],
      system: { updatedBefore: '2099-01-01T00:00:00.000Z' },
    };

    H.setRawResp({ nodes: [{ id: 1 }] });

    try {
      await consentWindowHasAny(sombra, {
        partition: 'p1',
        mode: 'timestamp',
        baseFilter: base,
        afterISO: '2025-01-01T00:00:00.000Z',
        beforeISO: '2025-02-01T00:00:00.000Z',
      });
      throw new Error('Expected error was not thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toMatch(/Failed to decode codec/i);
    }
  });

  it('builds a timestamp-mode filter (keeps base system) and returns true when nodes exist', async () => {
    const sombra = H.makeSombra();
    const base: PreferencesQueryFilter = {
      identifiers: [{ name: 'email', value: 'a@b.com' }],
      system: { updatedBefore: '2099-01-01T00:00:00.000Z' },
    };

    const response: PreferenceQueryResponseItem = {
      partition: 'p1',
      identifiers: [],
      purposes: [],
      consentManagement: {},
      timestamp: '2025-01-15T12:00:00.000Z',
      system: {
        decryptionStatus: 'DECRYPTED',
        updatedAt: '2025-01-10T00:00:00.000Z',
      },
    };
    H.setRawResp({ nodes: [response] });

    const ok = await consentWindowHasAny(sombra, {
      partition: 'p1',
      mode: 'timestamp',
      baseFilter: base,
      afterISO: '2025-01-01T00:00:00.000Z',
      beforeISO: '2025-02-01T00:00:00.000Z',
    });

    expect(ok).toBe(true);

    // Called via withPreferenceQueryRetry
    expect(withPreferenceQueryRetry).toHaveBeenCalledTimes(1);

    // Verify POST target + body
    expect(H.postCalls).toHaveLength(1);
    const call = H.postCalls[0];
    expect(call.url).toBe('v1/preferences/p1/query');

    // Body shape is the payload we passed: { limit, filter }
    const payload = call.body as {
      /** Limit */
      limit: number;
      /** Filter */
      filter: PreferencesQueryFilter;
    };
    expect(payload.limit).toBe(1);
    expect(payload.filter).toEqual({
      identifiers: base.identifiers,
      // mode=timestamp sets these:
      timestampAfter: '2025-01-01T00:00:00.000Z',
      timestampBefore: '2025-02-01T00:00:00.000Z',
      // base.system is preserved in timestamp mode by the SUT
      system: { updatedBefore: '2099-01-01T00:00:00.000Z' },
    });
  });

  it('builds an updated-mode filter (clears timestamp*, sets system.updated*) and returns false when no nodes', async () => {
    const sombra = H.makeSombra();
    const base: PreferencesQueryFilter = {
      identifiers: [{ name: 'phone', value: '+15551112222' }],
      system: { updatedBefore: '2099-01-01T00:00:00.000Z' },
      timestampAfter: 'SHOULD_BE_CLEARED',
      timestampBefore: 'ALSO_CLEARED',
    };

    H.setRawResp({ nodes: [] });

    const ok = await consentWindowHasAny(sombra, {
      partition: 'part-upd',
      mode: 'updated',
      baseFilter: base,
      afterISO: '2025-03-01T00:00:00.000Z',
      beforeISO: '2025-03-02T00:00:00.000Z',
    });

    expect(ok).toBe(false);

    expect(H.postCalls).toHaveLength(1);
    const { url, body } = H.postCalls[0];
    expect(url).toBe('v1/preferences/part-upd/query');

    // Body shape is { limit, filter }
    const payload = body as {
      /** Limit */
      limit: number;
      /** Filter */
      filter: PreferencesQueryFilter;
    };
    expect(payload.limit).toBe(1);
    expect(payload.filter).toEqual({
      identifiers: base.identifiers,
      // timestamp* must be removed in updated mode
      timestampAfter: undefined,
      timestampBefore: undefined,
      // system gets merged, with updatedAfter/Before set
      system: {
        updatedAfter: '2025-03-01T00:00:00.000Z',
        updatedBefore: '2025-03-02T00:00:00.000Z',
      },
    });
  });

  it('exposes onRetry hook that logs warnings with colored message', async () => {
    const sombra = H.makeSombra();

    // Return "some nodes" so function resolves to true; the retry test is about the hook, not outcome
    const response: PreferenceQueryResponseItem = {
      partition: 'p1',
      identifiers: [],
      purposes: [],
      consentManagement: {},
      timestamp: '2025-01-15T12:00:00.000Z',
      system: {
        decryptionStatus: 'DECRYPTED',
        updatedAt: '2025-01-10T00:00:00.000Z',
      },
    };
    H.setRawResp({ nodes: [response] });

    await consentWindowHasAny(sombra, {
      partition: 'p2',
      mode: 'timestamp',
      baseFilter: {},
      afterISO: '2025-01-01T00:00:00.000Z',
      beforeISO: '2025-01-02T00:00:00.000Z',
    });

    // Grab the retry opts and simulate a retry event
    const opts = H.getLastRetryOpts();
    expect(opts && typeof opts.onRetry).toBe('function');

    opts?.onRetry?.(2, new Error('boom'), 'boom');

    // logger.warn should have been called with the formatted message (colors.yellow is passthrough)
    expect(H.logger.warn).toHaveBeenCalledTimes(1);
    const msg = H.logger.warn.mock.calls[0]?.[0] as string;
    expect(msg).toContain(
      'Retry attempt 2 for consentWindowHasAny due to error: boom',
    );
  });
});
