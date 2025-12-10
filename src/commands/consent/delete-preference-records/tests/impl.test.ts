/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deletePreferenceRecords } from '../impl';
import type { DeletePreferenceRecordsCommandFlags } from '../impl';
import type { LocalContext } from '../../../../context';

const H = vi.hoisted(() => {
  const logger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  };

  // colors passthrough so assertions don’t include ANSI codes
  const colors = {
    green: (s: string) => s,
    yellow: (s: string) => s,
    magenta: (s: string) => s,
    cyan: (s: string) => s,
    red: (s: string) => s,
  };

  const doneInputValidation = vi.fn();

  // Sombra GOT instance returned by factory
  const sombra = { tag: 'sombra' };

  // spies for preference-management exports
  const bulkDeletePreferenceRecords = vi.fn(); // we'll .mockImplementationOnce per test to drive streaming

  // // CSV helpers (new code path)
  const writeCsv = vi.fn();

  const reaDirSync = vi.fn((): string[] => []);

  const gqlClient = { tag: 'gql' };

  return {
    logger,
    colors,
    doneInputValidation,
    sombra,
    bulkDeletePreferenceRecords,
    gqlClient,
    writeCsv,
    reaDirSync,
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

// GraphQL: sombra factory and client builder
vi.mock('../../../../lib/graphql', () => ({
  __esModule: true,
  // eslint-disable-next-line require-await
  createSombraGotInstance: vi.fn(async () => H.sombra),
  buildTranscendGraphQLClient: vi.fn(() => H.gqlClient),
}));

// New CSV helpers used by impl after your refactor
vi.mock('../../../../lib/helpers', () => ({
  writeCsv: H.writeCsv,
}));

// preference-management: forward and record args, then delegate to our spies
vi.mock('../../../../lib/preference-management', () => ({
  // eslint-disable-next-line require-await
  bulkDeletePreferenceRecords: async (sombra: unknown, opts: any) =>
    H.bulkDeletePreferenceRecords(sombra, opts),
}));

vi.mock('node:fs', () => ({
  readdirSync: H.reaDirSync,
}));

describe('deletePreferenceRecordsImpl', () => {
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
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };

    await deletePreferenceRecords.call(ctx, flags);

    expect(H.doneInputValidation).toHaveBeenCalledTimes(1);
    expect(H.doneInputValidation).toHaveBeenCalledWith(ctx.process.exit);
  });

  it('errors if both file and directory are provided', async () => {
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      directory: '/tmp/dir',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.logger.error).toHaveBeenCalledWith(
      H.colors.red(
        'Cannot provide both a directory and a file. Please provide only one.',
      ),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('errors if neither file nor directory is provided', async () => {
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.logger.error).toHaveBeenCalledWith(
      H.colors.red(
        'A file or directory must be provided. Please provide one using --file=./preferences.csv or --directory=./preferences',
      ),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('errors if file is not a CSV', async () => {
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.txt',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.logger.error).toHaveBeenCalledWith(
      H.colors.red('File must be a CSV file'),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('errors if directory has no CSV files', async () => {
    // Mock readdirSync to return no CSVs
    vi.doMock('node:fs', () => ({
      readdirSync: vi.fn(() => ['not-a-csv.txt']),
    }));
    // Re-import impl to use new mock
    const { deletePreferenceRecords: deletePrefRecs } = await import('../impl');
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      directory: '/tmp/dir',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePrefRecs.call(ctx, flags);
    expect(H.logger.error).toHaveBeenCalledWith(
      H.colors.red('No CSV files found in directory: /tmp/dir'),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('processes a single CSV file successfully', async () => {
    H.bulkDeletePreferenceRecords.mockResolvedValueOnce([]);
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.bulkDeletePreferenceRecords).toHaveBeenCalledWith(
      H.sombra,
      expect.objectContaining({ filePath: '/tmp/out.csv' }),
    );
    expect(H.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Deletion Summary Report'),
    );
    expect(H.writeCsv).not.toHaveBeenCalled();
  });

  it('processes multiple CSV files in a directory', async () => {
    // Mock readdirSync to return CSVs

    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      directory: '/tmp/dir',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    H.reaDirSync.mockReturnValueOnce(['a.csv', 'b.csv', 'c.csv']);
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.bulkDeletePreferenceRecords).toHaveBeenCalledTimes(3);
    expect(H.bulkDeletePreferenceRecords).toHaveBeenCalledWith(
      H.sombra,
      expect.objectContaining({ filePath: expect.stringContaining('a.csv') }),
    );
    expect(H.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Deletion Summary Report'),
    );
  });

  it('writes a receipt if there are failed deletions', async () => {
    H.bulkDeletePreferenceRecords.mockResolvedValueOnce([
      { id: 1, error: 'fail' },
    ]);
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.writeCsv).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/receipts/deletion-failures-'),
      [{ id: 1, error: 'fail' }],
      true,
    );
    expect(H.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Receipt Path:'),
    );
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
