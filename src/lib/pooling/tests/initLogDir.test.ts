import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  readdirSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs';
import { initLogDir } from '../logRotation';

/**
 * Mock colors BEFORE importing the SUT.
 * Keep output stable by returning the same string (no color codes).
 */
vi.mock('colors', () => ({
  default: { dim: (s: string) => s },
}));

/**
 * Hoist-safe fs mock: define mock fns INSIDE the factory and
 * access them via normal imports + vi.mocked(...) in the tests.
 */
vi.mock('node:fs', () => {
  const readdirSync = vi.fn();
  const writeFileSync = vi.fn();
  const existsSync = vi.fn();
  const unlinkSync = vi.fn();
  const mkdirSync = vi.fn();
  return {
    readdirSync,
    writeFileSync,
    existsSync,
    unlinkSync,
    mkdirSync,
  };
});

describe('initLogDir (drives resetWorkerLogs side effects)', () => {
  const mReaddirSync = vi.mocked(readdirSync);
  const mWriteFileSync = vi.mocked(writeFileSync);
  const mExistsSync = vi.mocked(existsSync);
  const mUnlinkSync = vi.mocked(unlinkSync);
  const mMkdirSync = vi.mocked(mkdirSync);

  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    writeSpy = vi
      .spyOn(process.stdout, 'write')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => true) as any;

    // Default directory contents for resetWorkerLogs
    mReaddirSync.mockReturnValue([
      'worker-1.log',
      'worker-2.out.log',
      'worker-3.err.log',
      'worker-4.warn.log',
      'worker-5.info.log',
      'other.txt',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('creates logs dir and truncates matching files by default (RESET_LOGS unset → truncate)', () => {
    // Ensure no env override
    const old = process.env.RESET_LOGS;
    delete process.env.RESET_LOGS;

    const dir = initLogDir('/tmp/root');
    expect(dir).toBe('/tmp/root/logs');

    expect(mMkdirSync).toHaveBeenCalledWith('/tmp/root/logs', {
      recursive: true,
    });

    // truncate mode → writeFileSync('', '')
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/tmp/root/logs/worker-1.log',
      '',
    );
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/tmp/root/logs/worker-2.out.log',
      '',
    );
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/tmp/root/logs/worker-3.err.log',
      '',
    );
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/tmp/root/logs/worker-4.warn.log',
      '',
    );
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/tmp/root/logs/worker-5.info.log',
      '',
    );

    // status line printed
    const msg = String(writeSpy.mock.calls.at(-1)?.[0] ?? '');
    expect(msg).toContain('truncated');
    expect(msg).toContain('/tmp/root/logs');

    // restore
    if (old !== undefined) process.env.RESET_LOGS = old;
  });

  it('deletes files when RESET_LOGS=delete (and falls back to truncate for non-existent)', () => {
    const old = process.env.RESET_LOGS;
    process.env.RESET_LOGS = 'delete';

    // exists only for some paths
    mExistsSync.mockImplementation((pRaw) => {
      const p = String(pRaw);
      return p.endsWith('worker-1.log') || p.endsWith('worker-2.out.log');
    });

    const dir = initLogDir('/var/data');
    expect(dir).toBe('/var/data/logs');

    // mkdir called
    expect(mMkdirSync).toHaveBeenCalledWith('/var/data/logs', {
      recursive: true,
    });

    // delete where existsSync true
    expect(mUnlinkSync).toHaveBeenCalledWith('/var/data/logs/worker-1.log');
    expect(mUnlinkSync).toHaveBeenCalledWith('/var/data/logs/worker-2.out.log');

    // for the others (existsSync false) → truncate fallback (write empty file)
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/var/data/logs/worker-3.err.log',
      '',
    );
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/var/data/logs/worker-4.warn.log',
      '',
    );
    expect(mWriteFileSync).toHaveBeenCalledWith(
      '/var/data/logs/worker-5.info.log',
      '',
    );

    const msg = String(writeSpy.mock.calls.at(-1)?.[0] ?? '');
    expect(msg).toContain('deleted');
    expect(msg).toContain('/var/data/logs');

    // restore env
    if (old !== undefined) process.env.RESET_LOGS = old;
    else delete process.env.RESET_LOGS;
  });
});
