// collectCsvFilesOrExit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join as pathJoin } from 'node:path';

// Now import mocked symbols + SUT
import { readdirSync, statSync } from 'node:fs';

import { collectCsvFilesOrExit } from '../collectCsvFilesOrExit';
import type { LocalContext } from '../../../context';

/** 🔧 Hoist shared spies so the mock factory can safely capture them */
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

describe('collectCsvFilesOrExit', () => {
  it('exits when directory is undefined', () => {
    const ctx = makeCtx();

    expect(() => collectCsvFilesOrExit(undefined, ctx)).toThrowError(/EXIT:1/);

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

    expect(() => collectCsvFilesOrExit('/data/in', ctx)).toThrowError(/EXIT:1/);

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

  it('exits when no CSV files are found', () => {
    const ctx = makeCtx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mReadDir.mockReturnValue(['notes.txt', 'image.png'] as any);
    mStat.mockReturnValue({ isFile: () => true } as unknown as ReturnType<
      typeof statSync
    >);

    expect(() => collectCsvFilesOrExit('/dir', ctx)).toThrowError(/EXIT:1/);

    expect(H.loggerSpies.error).toHaveBeenCalledWith(
      expect.stringContaining('No CSV files found in directory: /dir'),
    );
    expect(ctx.process.exit).toHaveBeenCalledWith(1);
  });

  it('returns only CSV files that are real files', () => {
    const ctx = makeCtx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mReadDir.mockReturnValue(['a.csv', 'b.txt', 'c.csv'] as any);
    mStat.mockImplementation((p) => {
      const isFile =
        p === pathJoin('/data', 'a.csv') || p === pathJoin('/data', 'c.csv');
      return { isFile: () => isFile } as unknown as ReturnType<typeof statSync>;
    });

    const out = collectCsvFilesOrExit('/data', ctx);

    expect(out).toEqual([
      pathJoin('/data', 'a.csv'),
      pathJoin('/data', 'c.csv'),
    ]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
    expect(H.loggerSpies.error).not.toHaveBeenCalled();
  });

  it('filters out CSV entries whose statSync throws (e.g., broken symlink)', () => {
    const ctx = makeCtx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mReadDir.mockReturnValue(['good.csv', 'bad.csv', 'skip.txt'] as any);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/x', 'bad.csv')) throw new Error('ENOENT');
      return { isFile: () => true } as unknown as ReturnType<typeof statSync>;
    });

    const out = collectCsvFilesOrExit('/x', ctx);

    expect(out).toEqual([pathJoin('/x', 'good.csv')]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
  });

  it('ignores CSVs that are directories (isFile() === false)', () => {
    const ctx = makeCtx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mReadDir.mockReturnValue(['dirlike.csv', 'real.csv'] as any);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/root', 'dirlike.csv')) {
        return { isFile: () => false } as unknown as ReturnType<
          typeof statSync
        >;
      }
      return { isFile: () => true } as unknown as ReturnType<typeof statSync>;
    });

    const out = collectCsvFilesOrExit('/root', ctx);

    expect(out).toEqual([pathJoin('/root', 'real.csv')]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
  });
});
