import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join as pathJoin } from 'node:path';

// Now import mocked symbols + SUT
import { readdirSync, statSync } from 'node:fs';

import type { LocalContext } from '../../../context';
import { collectParquetFilesOrExit } from '../collectParquetFilesOrExit';

const H = vi.hoisted(() => ({
  loggerSpies: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

/** Mock fs BEFORE importing the SUT */
vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

/**
 * Mock the SAME module id the SUT imports.
 * From src/lib/helpers/tests/* to src/logger = ../../../logger
 */
vi.mock('../../../logger', () => ({
  logger: H.loggerSpies,
}));
const mReadDir = vi.mocked(readdirSync);
const mStat = vi.mocked(statSync);

/**
 * Minimal LocalContext stub that throws on exit
 *
 * @returns A mock context with an exit function
 */
function makeCtx(): LocalContext {
  return {
    process: {
      exit: vi.fn((code?: number) => {
        const err = new Error(`EXIT:${code ?? ''}`);
        err.name = 'ExitSignal';
        throw err;
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('collectParquetFilesOrExit', () => {
  it('exits when directory is undefined', () => {
    const ctx = makeCtx();

    expect(() => collectParquetFilesOrExit(undefined, ctx)).toThrowError(
      /EXIT:1/,
    );

    expect(H.loggerSpies.error).toHaveBeenCalledWith(
      expect.stringContaining('--directory must be provided'),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('exits when readdirSync throws (cannot read directory)', () => {
    const ctx = makeCtx();

    mReadDir.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => collectParquetFilesOrExit('/data/in', ctx)).toThrowError(
      /EXIT:1/,
    );

    expect(H.loggerSpies.error).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Failed to read directory: /data/in'),
    );
    expect(H.loggerSpies.error).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('boom'),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('exits when no Parquet files are found', () => {
    const ctx = makeCtx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mReadDir.mockReturnValue(['notes.txt', 'image.png'] as any);
    mStat.mockReturnValue({ isFile: () => true } as unknown as ReturnType<
      typeof statSync
    >);

    expect(() => collectParquetFilesOrExit('/dir', ctx)).toThrowError(/EXIT:1/);

    expect(H.loggerSpies.error).toHaveBeenCalledWith(
      expect.stringContaining('No Parquet files found in directory: /dir'),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('returns only .parquet files that are real files', () => {
    const ctx = makeCtx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mReadDir.mockReturnValue(['a.parquet', 'b.txt', 'c.parquet'] as any);
    mStat.mockImplementation((p) => {
      const isFile =
        p === pathJoin('/data', 'a.parquet') ||
        p === pathJoin('/data', 'c.parquet');
      return { isFile: () => isFile } as unknown as ReturnType<typeof statSync>;
    });

    const out = collectParquetFilesOrExit('/data', ctx);

    expect(out).toEqual([
      pathJoin('/data', 'a.parquet'),
      pathJoin('/data', 'c.parquet'),
    ]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
    expect(H.loggerSpies.error).not.toHaveBeenCalled();
  });

  it('filters out .parquet entries whose statSync throws (e.g., broken symlink)', () => {
    const ctx = makeCtx();

    mReadDir.mockReturnValue([
      'good.parquet',
      'bad.parquet',
      'skip.txt',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/x', 'bad.parquet')) throw new Error('ENOENT');
      return { isFile: () => true } as unknown as ReturnType<typeof statSync>;
    });

    const out = collectParquetFilesOrExit('/x', ctx);

    expect(out).toEqual([pathJoin('/x', 'good.parquet')]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
  });

  it('ignores .parquet entries that are directories (isFile() === false)', () => {
    const ctx = makeCtx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mReadDir.mockReturnValue(['dirlike.parquet', 'real.parquet'] as any);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/root', 'dirlike.parquet')) {
        return { isFile: () => false } as unknown as ReturnType<
          typeof statSync
        >;
      }
      return { isFile: () => true } as unknown as ReturnType<typeof statSync>;
    });

    const out = collectParquetFilesOrExit('/root', ctx);

    expect(out).toEqual([pathJoin('/root', 'real.parquet')]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
  });
});
