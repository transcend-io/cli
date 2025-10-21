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
  const fetchConsentPreferences = vi.fn();
  const transformPreferenceRecordToCsv = vi.fn((x: unknown) => ({ csv: x }));

  // spy for writing CSV
  const writeCsv = vi.fn();

  // capture the last args passed to fetchConsentPreferences
  const lastFetchArgs: {
    sombra?: unknown;
    opts?: unknown;
  } = {};

  return {
    logger,
    colors,
    doneInputValidation,
    sombra,
    fetchConsentPreferences,
    transformPreferenceRecordToCsv,
    writeCsv,
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

vi.mock('../../../../lib/cron', () => ({
  writeCsv: H.writeCsv,
}));

vi.mock('../../../../lib/preference-management', () => ({
  // eslint-disable-next-line require-await
  fetchConsentPreferences: async (sombra: unknown, opts: unknown) => {
    H.lastFetchArgs.sombra = sombra;
    H.lastFetchArgs.opts = opts;
    return H.fetchConsentPreferences(sombra, opts);
  },
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

    H.fetchConsentPreferences.mockResolvedValueOnce([]);
    await pullConsentPreferences.call(ctx, flags);

    expect(H.doneInputValidation).toHaveBeenCalledTimes(1);
    expect(H.doneInputValidation).toHaveBeenCalledWith(ctx.process.exit);
  });

  it('parses identifiers (with and without ":"), builds filter, passes limit=concurrency, logs, transforms, and writes CSV', async () => {
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

    const apiNodes = [
      { partition: 'part-xyz', timestamp: '2025-06-01T01:00:00.000Z' },
      { partition: 'part-xyz', timestamp: '2025-06-01T02:00:00.000Z' },
    ];

    H.fetchConsentPreferences.mockResolvedValueOnce(apiNodes);

    await pullConsentPreferences.call(ctx, flags);

    // fetchConsentPreferences called once, with sombra instance from factory
    expect(H.lastFetchArgs.sombra).toBe(H.sombra);

    // Verify options passed to fetchConsentPreferences
    const opts = H.lastFetchArgs.opts as {
      partition: string;
      filterBy: Record<string, unknown>;
      limit: number;
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

    // Logs: started, fetched N, writing, success
    expect(H.logger.info).toHaveBeenCalledWith(
      'Fetching consent preferences from partition part-xyz...',
    );
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes(
          `Fetched ${apiNodes.length} consent preference records from partition part-xyz.`,
        ),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes(
          'Writing preferences to CSV file at: /abs/prefs.csv',
        ),
      ),
    ).toBe(true);
    expect(
      H.logger.info.mock.calls.some((c) =>
        String(c[0]).includes(
          'Successfully wrote preferences to /abs/prefs.csv',
        ),
      ),
    ).toBe(true);

    expect(H.transformPreferenceRecordToCsv).toHaveBeenCalledTimes(
      apiNodes.length,
    );

    const { calls } = H.transformPreferenceRecordToCsv.mock;

    // 1st call: value, index, array
    expect(calls[0][0]).toEqual(apiNodes[0]);
    expect((calls as any)[0][1]).toBe(0);
    expect((calls as any)[0][2]).toBe(apiNodes);

    // 2nd call: value, index, array
    expect(calls[1][0]).toEqual(apiNodes[1]);
    expect((calls as any)[1][1]).toBe(1);
    expect((calls as any)[1][2]).toBe(apiNodes);

    // writeCsv called with mapped rows
    expect(H.writeCsv).toHaveBeenCalledTimes(1);
    const [pathArg, rowsArg] = H.writeCsv.mock.calls[0];
    expect(pathArg).toBe('/abs/prefs.csv');
    expect(Array.isArray(rowsArg)).toBe(true);
    expect(rowsArg).toEqual(apiNodes.map((n) => ({ csv: n }))); // our mock transform
  });

  it('omits identifiers/system/timestamps in filter when flags are absent', async () => {
    const flags: PullConsentPreferencesCommandFlags = {
      auth: 'tok',
      partition: 'p0',
      file: '/tmp/x.csv',
      transcendUrl: 'https://example',
      concurrency: 5,
      shouldChunk: false,
    };

    H.fetchConsentPreferences.mockResolvedValueOnce([]);

    await pullConsentPreferences.call(ctx, flags);

    const opts = H.lastFetchArgs.opts as {
      partition: string;
      filterBy: Record<string, unknown>;
      limit: number;
    };

    expect(opts.partition).toBe('p0');
    expect(opts.limit).toBe(5);
    // Should be an empty object
    expect(opts.filterBy).toEqual({});
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
