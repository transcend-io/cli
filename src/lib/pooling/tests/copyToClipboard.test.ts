import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';

import { spawn } from 'node:child_process';
import { copyToClipboard } from '../os';

/**
 * Mock child_process BEFORE importing the SUT.
 */
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

const mSpawn = vi.mocked(spawn);

/**
 * Build a fake child process with a writable-like stdin.
 *
 * @returns fake child with stdin.end spy
 */
function makeChild(): {
  /** standard input */
  stdin: {
    /** Spy for end method */
    end: Mock;
  };
} {
  const end = vi.fn();
  return {
    stdin: {
      end,
    },
  };
}

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

describe('copyToClipboard', () => {
  let restore: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (restore) restore();
  });

  it('returns false for empty text or text starting with "("', () => {
    restore = mockPlatform('linux');
    expect(copyToClipboard('')).toBe(false);
    expect(copyToClipboard('(internal) Copy this')).toBe(false);
    expect(mSpawn).not.toHaveBeenCalled();
  });

  it('darwin: uses pbcopy and writes text as-is', () => {
    restore = mockPlatform('darwin');
    const child = makeChild();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue(child as any);

    const ok = copyToClipboard('hello\nworld');
    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith('pbcopy');
    expect(child.stdin.end).toHaveBeenCalledWith('hello\nworld');
  });

  it('win32: uses clip and converts LF to CRLF', () => {
    restore = mockPlatform('win32');
    const child = makeChild();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue(child as any);

    const ok = copyToClipboard('a\nb\nc');
    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith('clip');
    expect(child.stdin.end).toHaveBeenCalledWith('a\r\nb\r\nc');
  });

  it('linux: prefers xclip; on error falls back to xsel', () => {
    restore = mockPlatform('linux');

    const child = makeChild();
    // Two-phase behavior: first call (xclip) throws, second (xsel) returns child
    mSpawn.mockImplementationOnce(() => {
      throw new Error('xclip missing');
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockImplementationOnce(() => child as any);

    const ok = copyToClipboard('linux text');
    expect(ok).toBe(true);

    // First attempt: xclip with -selection clipboard
    expect(mSpawn).toHaveBeenNthCalledWith(1, 'xclip', [
      '-selection',
      'clipboard',
    ]);
    // Fallback: xsel --clipboard --input
    expect(mSpawn).toHaveBeenNthCalledWith(2, 'xsel', [
      '--clipboard',
      '--input',
    ]);
    expect(child.stdin.end).toHaveBeenCalledWith('linux text');
  });

  it('linux: returns false if both xclip and xsel fail', () => {
    restore = mockPlatform('linux');

    mSpawn.mockImplementation(() => {
      throw new Error('no clipboard utility');
    });

    const ok = copyToClipboard('nope');
    expect(ok).toBe(false);

    // xclip attempted
    expect(mSpawn).toHaveBeenCalledWith('xclip', ['-selection', 'clipboard']);
    // xsel attempted
    expect(mSpawn).toHaveBeenCalledWith('xsel', ['--clipboard', '--input']);
  });
});
