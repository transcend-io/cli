import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';

import { spawn } from 'node:child_process';
import { revealInFileManager } from '../os';

/**
 * Mock child_process BEFORE importing the SUT.
 */
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

const mSpawn = vi.mocked(spawn);

/**
 * Temporarily override process.platform for a test.
 *
 * @param platform - desired platform
 * @returns restore function
 */
function mockPlatform(platform: NodeJS.Platform): () => void {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform });
  return () => {
    Object.defineProperty(process, 'platform', { value: original });
  };
}

describe('revealInFileManager', () => {
  let restore: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (restore) restore();
  });

  it('returns false for empty path or paths starting with "("', () => {
    restore = mockPlatform('linux');
    expect(revealInFileManager('')).toBe(false);
    expect(revealInFileManager('(temp)')).toBe(false);
    expect(mSpawn).not.toHaveBeenCalled();
  });

  it('darwin: uses open -R <path>', () => {
    restore = mockPlatform('darwin');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue({ unref: vi.fn() } as any);

    const ok = revealInFileManager('/Users/me/movie.mov');
    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith('open', ['-R', '/Users/me/movie.mov'], {
      stdio: 'ignore',
      detached: true,
    });
  });

  it('win32: uses explorer.exe /select, <path>', () => {
    restore = mockPlatform('win32');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue({ unref: vi.fn() } as any);

    const ok = revealInFileManager('C:\\Users\\me\\data.csv');
    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith(
      'explorer.exe',
      ['/select,', 'C:\\Users\\me\\data.csv'],
      {
        stdio: 'ignore',
        detached: true,
      },
    );
  });

  it('linux: best-effort xdg-open <dirname(path)>', () => {
    restore = mockPlatform('linux');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue({ unref: vi.fn() } as any);

    const p = '/var/log/app/worker-1.log';
    const ok = revealInFileManager(p);
    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith('xdg-open', [join('/var/log/app')], {
      stdio: 'ignore',
      detached: true,
    });
  });
});
