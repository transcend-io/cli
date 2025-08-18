import { describe, it, expect, vi, beforeEach } from 'vitest';

import colors from 'colors';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { openLogTailWindowMulti } from '../openTerminal';

/**
 * Mock external deps BEFORE importing the SUT.
 */
vi.mock('colors', () => ({
  default: {
    red: vi.fn((s: string) => `[red]${s}`),
  },
}));
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));
vi.mock('node:os', () => ({
  platform: vi.fn(),
}));

const mSpawn = vi.mocked(spawn);
const mPlatform = vi.mocked(platform);
const mRed = vi.mocked(colors.red);

/**
 * Build a fake ChildProcess-like object that supports `.unref()`.
 *
 * @returns An object with an `unref` spy function.
 */
function fakeChild(): {
  /** Spy for unref() */
  unref: () => void;
} {
  return {
    unref: vi.fn(),
  };
}

describe('openLogTailWindowMulti', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when isSilent is true', () => {
    mPlatform.mockReturnValue('darwin');

    openLogTailWindowMulti(['/a.log'], 'My Title', true);

    expect(mSpawn).not.toHaveBeenCalled();
    // No need to assert logger calls here; silent path short-circuits.
  });

  it('macOS: uses osascript with an AppleScript that tails escaped paths', () => {
    mPlatform.mockReturnValue('darwin');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue(fakeChild() as any);

    const paths = ['/var/log/app.log', "weird name's.log"];
    const title = 'Pool Tail';

    openLogTailWindowMulti(paths, title);

    expect(mSpawn).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = mSpawn.mock.calls[0]!;

    expect(cmd).toBe('osascript');
    expect(args?.[0]).toBe('-e');

    const script = String(args?.[1]);
    // Includes title and tail command
    expect(script).toContain(`\\e]0;${title}\\a`);
    // Escaped file paths appear with -f flags
    expect(script).toContain(
      "tail -n +1 -f '/var/log/app.log' -f 'weird name'\\''s.log'",
    );
    expect(opts).toEqual({ stdio: 'ignore', detached: true });
  });

  it('Windows: starts cmd.exe with PowerShell to tail multiple files and calls unref()', () => {
    mPlatform.mockReturnValue('win32');
    const child = fakeChild();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue(child as any);

    const paths = ['C:\\logs\\one.log', "C:\\O'Brien\\two.log"];
    const title = 'Tail Window';

    openLogTailWindowMulti(paths, title);

    expect(mSpawn).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = mSpawn.mock.calls[0]!;

    expect(cmd).toBe('cmd.exe');
    // Flattened args include /c start + powershell bits
    expect(args?.slice(0, 3)).toEqual(['/c', 'start', 'powershell']);
    expect(args).toContain('-NoExit');
    expect(args).toContain('-Command');

    // The last arg is the PS command line; assert key parts.
    const psCmd = String(args?.[args.length - 1]);
    expect(psCmd).toContain(`Write-Host '${title}'`);
    // Single quotes inside PowerShell strings are doubled
    expect(psCmd).toContain("'C:\\O''Brien\\two.log'");

    expect(opts).toEqual({ stdio: 'ignore', detached: true });
    expect(child.unref).toHaveBeenCalledTimes(1);
  });

  it('Linux: prefers gnome-terminal (bash -lc ...), calls unref()', () => {
    mPlatform.mockReturnValue('linux');
    const child = fakeChild();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockReturnValue(child as any);

    openLogTailWindowMulti(['/tmp/a.log', '/tmp/b.log'], 'Linux Tail');

    expect(mSpawn).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = mSpawn.mock.calls[0]!;
    expect(cmd).toBe('gnome-terminal');
    expect(args).toEqual([
      '--',
      'bash',
      '-lc',
      expect.stringContaining(
        "printf '\\e]0;Linux Tail\\a'; tail -n +1 -f '/tmp/a.log' -f '/tmp/b.log'",
      ),
    ]);
    expect(opts).toEqual({ stdio: 'ignore', detached: true });
    expect(child.unref).toHaveBeenCalledTimes(1);
  });

  it('Linux: falls back to xterm when gnome-terminal spawn throws', () => {
    mPlatform.mockReturnValue('linux');

    // First call (gnome-terminal) throws; second (xterm) returns child
    mSpawn.mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });
    const child = fakeChild();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mSpawn.mockImplementationOnce(() => child as any);

    openLogTailWindowMulti(['/var/log/x.log'], 'Fallback Tail');

    expect(mSpawn).toHaveBeenCalledTimes(2);

    const [cmd1] = mSpawn.mock.calls[0]!;
    expect(cmd1).toBe('gnome-terminal');

    const [cmd2, args2, opts2] = mSpawn.mock.calls[1]!;
    expect(cmd2).toBe('xterm');
    expect(args2).toEqual([
      '-title',
      'Fallback Tail',
      '-e',
      // Note: xterm branch uses a plain join without shell escaping
      'tail -n +1 -f /var/log/x.log',
    ]);
    expect(opts2).toEqual({ stdio: 'ignore', detached: true });
    expect(child.unref).toHaveBeenCalledTimes(1);
  });

  it('logs (via colors.red) and rethrows unexpected errors (outer catch)', () => {
    mPlatform.mockReturnValue('darwin');
    const boom = new Error('kaboom');
    mSpawn.mockImplementation(() => {
      throw boom;
    });

    expect(() => openLogTailWindowMulti(['/x.log'], 'Err Tail')).toThrow(boom);

    // We can reliably assert that colors.red was called to format the error line.
    expect(mRed).toHaveBeenCalled();
    const formatted = String(mRed.mock.calls[0]?.[0]);
    expect(formatted).toContain(
      'Failed to open terminal window for tailing logs',
    );
    expect(formatted).toContain('kaboom');
  });
});
