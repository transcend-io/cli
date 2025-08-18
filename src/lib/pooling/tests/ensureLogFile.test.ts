import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ensureLogFile } from '../ensureLogFile';
import { existsSync, openSync, closeSync } from 'node:fs';

/**
 * Mock fs BEFORE importing the SUT.
 * Inline factory avoids Vitest hoisting pitfalls.
 */
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  openSync: vi.fn(),
  closeSync: vi.fn(),
}));

const mExists = vi.mocked(existsSync);
const mOpen = vi.mocked(openSync);
const mClose = vi.mocked(closeSync);

describe('ensureLogFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('touches (open+close) when file does not exist', () => {
    mExists.mockReturnValue(false);
    mOpen.mockReturnValue(42);

    const path = '/tmp/test.log';
    ensureLogFile(path);

    expect(mExists).toHaveBeenCalledWith(path);
    expect(mOpen).toHaveBeenCalledWith(path, 'a');
    expect(mClose).toHaveBeenCalledWith(42);
  });

  it('does nothing when file already exists', () => {
    mExists.mockReturnValue(true);

    const path = '/tmp/already.log';
    ensureLogFile(path);

    expect(mExists).toHaveBeenCalledWith(path);
    expect(mOpen).not.toHaveBeenCalled();
    expect(mClose).not.toHaveBeenCalled();
  });

  it('propagates errors from openSync and does not call closeSync', () => {
    mExists.mockReturnValue(false);
    const boom = new Error('EACCES');
    mOpen.mockImplementation(() => {
      throw boom;
    });

    expect(() => ensureLogFile('/tmp/nope.log')).toThrow(boom);
    expect(mClose).not.toHaveBeenCalled();
  });

  it('propagates errors from closeSync after successful open', () => {
    mExists.mockReturnValue(false);
    mOpen.mockReturnValue(7);
    const boom = new Error('EBADF');
    mClose.mockImplementation(() => {
      throw boom;
    });

    expect(() => ensureLogFile('/tmp/close-fails.log')).toThrow(boom);
    expect(mOpen).toHaveBeenCalledWith('/tmp/close-fails.log', 'a');
    expect(mClose).toHaveBeenCalledWith(7);
  });
});
