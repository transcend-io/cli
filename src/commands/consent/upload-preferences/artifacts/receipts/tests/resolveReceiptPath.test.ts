import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';

// Now import the SUT
import { resolveReceiptPath } from '../resolveReceiptPath';
import type { getFilePrefix } from '../../computeFiles';

const H = vi.hoisted(() => {
  const existsSync = vi.fn();
  const readdirSync = vi.fn();
  const statSync = vi.fn();

  const getFilePrefix = vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (...args: string[]) => 'FILE',
  );

  const resetFs = (): void => {
    existsSync.mockReset();
    readdirSync.mockReset();
    statSync.mockReset();
  };
  const resetCF = (): void => {
    getFilePrefix.mockReset();
    getFilePrefix.mockReturnValue('FILE');
  };

  return { existsSync, readdirSync, statSync, getFilePrefix, resetFs, resetCF };
});

vi.mock('node:fs', () => ({
  existsSync: (...a: unknown[]) => H.existsSync(...a),
  readdirSync: (...a: unknown[]) => H.readdirSync(...a),
  statSync: (...a: unknown[]) => H.statSync(...a),
}));

vi.mock('../../computeFiles', () => ({
  // forward the arguments so the spy records them
  getFilePrefix: (...a: Parameters<typeof getFilePrefix>) =>
    H.getFilePrefix(...a),
}));

// -----------------------------------------------------------------------------

describe('resolveReceiptPath', () => {
  const folder = '/receipts';
  const file = '/some/path/input.csv';

  beforeEach(() => {
    H.resetFs();
    H.resetCF();
  });

  it('returns the exact receipt path when it exists (short-circuit, no directory scan)', () => {
    const expectedBase = 'FILE-receipts.json';
    const expected = join(folder, expectedBase);

    H.existsSync.mockReturnValueOnce(true);

    const out = resolveReceiptPath(folder, file);

    expect(H.getFilePrefix).toHaveBeenCalledWith(file);
    expect(H.existsSync).toHaveBeenCalledWith(expected);
    expect(out).toBe(expected);

    expect(H.readdirSync).not.toHaveBeenCalled();
    expect(H.statSync).not.toHaveBeenCalled();
  });

  it('scans directory and returns the most recent matching suffix when exact does not exist', () => {
    H.existsSync.mockReturnValueOnce(false);

    H.readdirSync.mockReturnValueOnce([
      'FILE-receipts__1.json',
      'FILE-receipts__3.json',
      'FILE-receipts__2.json',
      'unrelated.txt',
      'OTHER-receipts.json',
    ]);

    H.statSync.mockImplementation((full: string) => {
      const mtimeMs = full.endsWith('FILE-receipts__3.json')
        ? 3000
        : full.endsWith('FILE-receipts__2.json')
        ? 2000
        : full.endsWith('FILE-receipts__1.json')
        ? 1000
        : 0;
      return { mtimeMs } as unknown as import('node:fs').Stats;
    });

    const out = resolveReceiptPath(folder, file);

    expect(H.readdirSync).toHaveBeenCalledWith(folder);
    expect(out).toBe(join(folder, 'FILE-receipts__3.json'));

    expect(H.statSync).toHaveBeenCalledTimes(3);
    expect(H.statSync).toHaveBeenCalledWith(
      join(folder, 'FILE-receipts__1.json'),
    );
    expect(H.statSync).toHaveBeenCalledWith(
      join(folder, 'FILE-receipts__2.json'),
    );
    expect(H.statSync).toHaveBeenCalledWith(
      join(folder, 'FILE-receipts__3.json'),
    );
  });

  it('ignores stat errors but still picks the newest among remaining candidates', () => {
    H.existsSync.mockReturnValueOnce(false);

    H.readdirSync.mockReturnValueOnce([
      'FILE-receipts__old.json',
      'FILE-receipts__new.json',
    ]);

    H.statSync.mockImplementation((full: string) => {
      if (full.endsWith('__old.json')) throw new Error('EPERM');
      return { mtimeMs: 9999 } as unknown as import('node:fs').Stats;
    });

    const out = resolveReceiptPath(folder, file);
    expect(out).toBe(join(folder, 'FILE-receipts__new.json'));
  });

  it('returns null when there are no matching files after filtering', () => {
    H.existsSync.mockReturnValueOnce(false);
    H.readdirSync.mockReturnValueOnce([
      'unrelated.json',
      'also-unrelated.txt',
      'FILE-not-a-receipt.json',
    ]);

    const out = resolveReceiptPath(folder, file);
    expect(out).toBeNull();
    expect(H.statSync).not.toHaveBeenCalled();
  });

  it('returns null when directory read throws', () => {
    H.existsSync.mockReturnValueOnce(false);
    H.readdirSync.mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });

    const out = resolveReceiptPath(folder, file);
    expect(out).toBeNull();
  });

  it('uses getFilePrefix value for both exact and prefix computations', () => {
    // It’s called twice in the SUT (exact and prefix), so persist the value across both calls.
    H.getFilePrefix.mockReturnValue('DYNAMIC');

    H.existsSync.mockReturnValueOnce(false);
    H.readdirSync.mockReturnValueOnce(['DYNAMIC-receipts__42.json']);
    H.statSync.mockReturnValueOnce({
      mtimeMs: 1,
    } as unknown as import('node:fs').Stats);

    const out = resolveReceiptPath(folder, file);
    expect(out).toBe(join(folder, 'DYNAMIC-receipts__42.json'));
  });
});
