import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { spawn } from 'node:child_process';
import { openPath } from '../os';

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
 * @param platform - e.g. 'win32' | 'darwin' | 'linux'
 * @returns restore function to reset platform
 */
function mockPlatform(platform: NodeJS.Platform): () => void {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform });
  return () => {
    Object.defineProperty(process, 'platform', { value: original });
  };
}

describe('openPath', () => {
  let restore: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (restore) restore();
  });

  it('returns false for empty path or paths starting with "("', () => {
    restore = mockPlatform('linux');
    expect(openPath('')).toBe(false);
    expect(openPath('(temporary)')).toBe(false);
    expect(mSpawn).not.toHaveBeenCalled();
  });

  it('windows: uses cmd /c start "" <path>', () => {
    restore = mockPlatform('win32');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue({ unref: vi.fn() } as any);

    const ok = openPath('C:\\foo\\bar.txt');

    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith(
      'cmd',
      ['/c', 'start', '', 'C:\\foo\\bar.txt'],
      {
        stdio: 'ignore',
        detached: true,
      },
    );
  });

  it('darwin: uses xdg-open (best-effort) as coded', () => {
    restore = mockPlatform('darwin');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue({ unref: vi.fn() } as any);

    const ok = openPath('/Users/me/file.pdf');

    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith('xdg-open', ['/Users/me/file.pdf'], {
      stdio: 'ignore',
      detached: true,
    });
  });

  it('linux: uses xdg-open <path>', () => {
    restore = mockPlatform('linux');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue({ unref: vi.fn() } as any);

    const ok = openPath('/tmp/a.png');

    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith('xdg-open', ['/tmp/a.png'], {
      stdio: 'ignore',
      detached: true,
    });
  });
});
