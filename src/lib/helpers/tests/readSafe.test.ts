import { describe, it, expect, vi, beforeEach } from 'vitest';

import { readFileSync } from 'node:fs';
import { readSafe } from '../readSafe';

/**
 * Mock fs BEFORE importing the SUT.
 * Use a factory so the mock is hoist-safe under Vitest.
 */
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

describe('readSafe', () => {
  const mRead = vi.mocked(readFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * When path is undefined, it should return an empty string
   * and not call fs at all.
   */
  it('returns empty string when path is undefined', () => {
    const out = readSafe(undefined);
    expect(out).toBe('');
    expect(mRead).not.toHaveBeenCalled();
  });

  /**
   * When given a valid path, it returns the file contents
   * and calls fs.readFileSync with 'utf8' encoding.
   */
  it('reads and returns file contents with utf8', () => {
    mRead.mockReturnValue('hello world');
    const out = readSafe('/tmp/test.txt');
    expect(out).toBe('hello world');
    expect(mRead).toHaveBeenCalledTimes(1);
    expect(mRead).toHaveBeenCalledWith('/tmp/test.txt', 'utf8');
  });

  /**
   * If fs.readFileSync throws, the function should swallow the error
   * and return an empty string.
   */
  it('returns empty string when readFileSync throws', () => {
    mRead.mockImplementation(() => {
      throw new Error('boom');
    });
    const out = readSafe('/tmp/missing.txt');
    expect(out).toBe('');
    expect(mRead).toHaveBeenCalledTimes(1);
  });

  /**
   * Empty string path is treated as "no path" (falsy) and returns empty,
   * without calling fs.
   */
  it('returns empty string when path is an empty string', () => {
    const out = readSafe('');
    expect(out).toBe('');
    expect(mRead).not.toHaveBeenCalled();
  });
});
