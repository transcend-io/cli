/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pullConsentPreferences } from '../impl';
import type { PullConsentPreferencesCommandFlags } from '../impl';
import type { LocalContext } from '../../../../context';

const H = vi.hoisted(() => {
  const logger = {
    info: vi.fn(),
  };

  // colors passthrough so assertions don’t include ANSI codes
  const colors = {
    green: (s: string) => s,
    yellow: (s: string) => s,
    magenta: (s: string) => s,
  };

  const doneInputValidation = vi.fn();

  // Sombra GOT instance returned by factory
  const sombra = { tag: 'sombra' };

  // spies for preference-management exports
  const fetchConsentPreferences = vi.fn(); // we'll .mockImplementationOnce per test to drive streaming
  const fetchConsentPreferencesChunked = vi.fn();
  const transformPreferenceRecordToCsv = vi.fn((x: unknown) => ({ csv: x }));

  // CSV helpers (new code path)
  const initCsvFile = vi.fn();
  const appendCsvRowsOrdered = vi.fn();

  // capture the last args passed to fetchConsentPreferences
  const lastFetchArgs: {
    sombra?: unknown;
    opts?: any;
  } = {};

  return {
    logger,
    colors,
    doneInputValidation,
    sombra,
    fetchConsentPreferences,
    fetchConsentPreferencesChunked,
    transformPreferenceRecordToCsv,
    initCsvFile,
    appendCsvRowsOrdered,
    lastFetchArgs,
  };
});

/* ----------------- Mocks (must be declared before importing SUT) ----------------- */
vi.mock('../../../../logger', () => ({ logger: H.logger }));

vi.mock('colors', () => ({
  __esModule: true,
  default: H.colors,
  ...H.colors,
}));

vi.mock('../../../../lib/cli/done-input-validation', () => ({
  doneInputValidation: H.doneInputValidation,
}));

// Mock the concrete creator…
vi.mock('../../../../lib/graphql/createSombraGotInstance', () => ({
  __esModule: true,
  // eslint-disable-next-line require-await
  createSombraGotInstance: vi.fn(async () => H.sombra),
}));

// …and the barrel that re-exports it
vi.mock('../../../../lib/graphql', () => ({
  __esModule: true,
  // eslint-disable-next-line require-await
  createSombraGotInstance: vi.fn(async () => H.sombra),
}));

// Safety net for any GraphQL calls
vi.mock('../../../../lib/graphql/makeGraphQLRequest', () => ({
  __esModule: true,
  // eslint-disable-next-line require-await
  makeGraphQLRequest: vi.fn(async () => ({
    organization: { sombra: { customerUrl: 'https://mocked' } },
  })),
}));

// New CSV helpers used by impl after your refactor
vi.mock('../../../../lib/helpers', () => ({
  initCsvFile: H.initCsvFile,
  appendCsvRowsOrdered: H.appendCsvRowsOrdered,
}));

// preference-management: forward and record args, then delegate to our spies
vi.mock('../../../../lib/preference-management', () => ({
  // eslint-disable-next-line require-await
  fetchConsentPreferences: async (sombra: unknown, opts: any) => {
    H.lastFetchArgs.sombra = sombra;
    H.lastFetchArgs.opts = opts;
    return H.fetchConsentPreferences(sombra, opts);
  },
  // eslint-disable-next-line require-await
  fetchConsentPreferencesChunked: async (sombra: unknown, opts: any) =>
    H.fetchConsentPreferencesChunked(sombra, opts),
  transformPreferenceRecordToCsv: H.transformPreferenceRecordToCsv,
}));

describe('pullConsentPreferences', () => {
  const ctx: LocalContext = {
    exit: vi.fn(),
    log: vi.fn(),
    process: {
      exit: vi.fn(),
    },
  } as unknown as LocalContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls doneInputValidation with ctx.process.exit', async () => {
    const flags: PullConsentPreferencesCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      transcendUrl: 'https://app.transcend.io',
      concurrency: 25,
      shouldChunk: false,
    };

    // streaming path: no accumulation; just ensure we can call onItems zero times
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, require-await
    H.fetchConsentPreferences.mockImplementationOnce(async (_sombra, _opts) =>
      // don't call onItems → no rows
      [],
    );

    await pullConsentPreferences.call(ctx, flags);

    expect(H.doneInputValidation).toHaveBeenCalledTimes(1);
    expect(H.doneInputValidation).toHaveBeenCalledWith(ctx.process.exit);

    // logs include mode and preparing/finished
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('using mode=paged-stream'),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('Preparing CSV at: /tmp/out.csv'),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('Finished writing CSV to /tmp/out.csv'),
      ),
    ).toBe(true);
  });

  it('parses identifiers, builds filter, passes limit=concurrency, streams pages, initializes header once, and appends rows', async () => {
    const flags: PullConsentPreferencesCommandFlags = {
      auth: 'tok',
      partition: 'part-xyz',
      sombraAuth: 'sombra-tok',
      file: '/abs/prefs.csv',
      transcendUrl: 'https://example',
      timestampBefore: new Date('2025-06-02T00:00:00.000Z'),
      timestampAfter: new Date('2025-06-01T00:00:00.000Z'),
      updatedBefore: new Date('2025-06-05T00:00:00.000Z'),
      updatedAfter: new Date('2025-06-03T00:00:00.000Z'),
      identifiers: [
        'plain@email.com', // -> {name:'email', value:'plain@email.com'}
        'phone:+11234567890', // -> {name:'phone', value:'+11234567890'}
        'email:second@email.com', // -> {name:'email', value:'second@email.com'}
      ],
      concurrency: 17,
      shouldChunk: false,
    };

    const page1 = [
      { partition: 'part-xyz', timestamp: '2025-06-01T01:00:00.000Z' },
    ];
    const page2 = [
      { partition: 'part-xyz', timestamp: '2025-06-01T02:00:00.000Z' },
    ];

    // streaming: call onItems twice
    H.fetchConsentPreferences.mockImplementationOnce(async (_sombra, opts) => {
      expect(typeof opts.onItems).toBe('function');
      await opts.onItems(page1 as any);
      await opts.onItems(page2 as any);
      return []; // streaming mode returns []
    });

    await pullConsentPreferences.call(ctx, flags);

    // fetchConsentPreferences called once, with sombra instance from factory
    expect(H.lastFetchArgs.sombra).toBe(H.sombra);

    // Verify options passed to fetchConsentPreferences
    const opts = H.lastFetchArgs.opts as {
      partition: string;
      filterBy: Record<string, unknown>;
      limit: number;
      onItems: (items: any[]) => Promise<void> | void;
    };
    expect(opts.partition).toBe('part-xyz');
    expect(opts.limit).toBe(17);

    // Filter composition
    expect(opts.filterBy).toEqual({
      timestampBefore: '2025-06-02T00:00:00.000Z',
      timestampAfter: '2025-06-01T00:00:00.000Z',
      system: {
        updatedBefore: '2025-06-05T00:00:00.000Z',
        updatedAfter: '2025-06-03T00:00:00.000Z',
      },
      identifiers: [
        { name: 'email', value: 'plain@email.com' },
        { name: 'phone', value: '+11234567890' },
        { name: 'email', value: 'second@email.com' },
      ],
    });

    // Logs: mode + preparing + finished (no aggregate count anymore)
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes(
          'Fetching consent preferences from partition part-xyz, using mode=paged-stream',
        ),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('Preparing CSV at: /abs/prefs.csv'),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('Finished writing CSV to /abs/prefs.csv'),
      ),
    ).toBe(true);

    // The transformer is called for each item in streaming order
    const allItems = [...page1, ...page2];
    expect(H.transformPreferenceRecordToCsv).toHaveBeenCalledTimes(
      allItems.length,
    );
    expect(H.transformPreferenceRecordToCsv.mock.calls[0][0]).toEqual(
      allItems[0],
    );
    expect(H.transformPreferenceRecordToCsv.mock.calls[1][0]).toEqual(
      allItems[1],
    );

    // initCsvFile called once with derived header from first transformed row
    expect(H.initCsvFile).toHaveBeenCalledTimes(1);
    const [initPath, headers] = H.initCsvFile.mock.calls[0];
    expect(initPath).toBe('/abs/prefs.csv');
    expect(headers).toEqual(['csv']); // from transformPreferenceRecordToCsv mock

    // appendCsvRowsOrdered called for each onItems invocation
    expect(H.appendCsvRowsOrdered).toHaveBeenCalledTimes(2);
    const [p1Path, p1Rows, p1Order] = H.appendCsvRowsOrdered.mock.calls[0];
    const [p2Path, p2Rows, p2Order] = H.appendCsvRowsOrdered.mock.calls[1];
    expect(p1Path).toBe('/abs/prefs.csv');
    expect(p2Path).toBe('/abs/prefs.csv');
    expect(p1Order).toEqual(['csv']);
    expect(p2Order).toEqual(['csv']);
    expect(p1Rows).toEqual(page1.map((n) => ({ csv: n })));
    expect(p2Rows).toEqual(page2.map((n) => ({ csv: n })));
  });

  it('omits identifiers/system/timestamps in filter when flags are absent; still streams with empty pages and writes header only after first rows', async () => {
    const flags: PullConsentPreferencesCommandFlags = {
      auth: 'tok',
      partition: 'p0',
      file: '/tmp/x.csv',
      transcendUrl: 'https://example',
      concurrency: 5,
      shouldChunk: false,
    };

    // No rows at all: onItems never called
    H.fetchConsentPreferences.mockImplementationOnce(
      // eslint-disable-next-line require-await, @typescript-eslint/no-unused-vars
      async (_sombra, _opts) => [],
    );

    await pullConsentPreferences.call(ctx, flags);

    const opts = H.lastFetchArgs.opts as {
      partition: string;
      filterBy: Record<string, unknown>;
      limit: number;
      onItems?: (items: any[]) => Promise<void> | void;
    };

    expect(opts.partition).toBe('p0');
    expect(opts.limit).toBe(5);
    // Should be an empty object
    expect(opts.filterBy).toEqual({});

    // Since no rows ever streamed, we never initialized/append
    expect(H.initCsvFile).not.toHaveBeenCalled();
    expect(H.appendCsvRowsOrdered).not.toHaveBeenCalled();

    // Logs show mode + preparing + finished
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('using mode=paged-stream'),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('Preparing CSV at: /tmp/x.csv'),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes('Finished writing CSV to /tmp/x.csv'),
      ),
    ).toBe(true);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
