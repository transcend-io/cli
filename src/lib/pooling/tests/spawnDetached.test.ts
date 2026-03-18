import { describe, it, expect, vi, beforeEach } from 'vitest';

import { spawn } from 'node:child_process';
import { spawnDetached } from '../os';

/**
 * Mock child_process BEFORE importing the SUT.
 * Inline factory avoids hoisting pitfalls.
 */
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

const mSpawn = vi.mocked(spawn);

describe('spawnDetached', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('spawns with detached+ignore, calls unref, and returns true', () => {
    const unref = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue({ unref } as any);

    const ok = spawnDetached('cmd', ['a', 'b']);

    expect(ok).toBe(true);
    expect(mSpawn).toHaveBeenCalledWith('cmd', ['a', 'b'], {
      stdio: 'ignore',
      detached: true,
    });
    expect(unref).toHaveBeenCalledTimes(1);
  });

  it('returns false if spawn throws', () => {
    mSpawn.mockImplementation(() => {
      throw new Error('boom');
    });

    const ok = spawnDetached('whatever', []);
    expect(ok).toBe(false);
  });
});
