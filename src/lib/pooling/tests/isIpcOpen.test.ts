import { describe, it, expect } from 'vitest';
import { isIpcOpen } from '../spawnWorkerProcess';
import type { ChildProcess } from 'node:child_process';

/**
 * Build a minimal ChildProcess-like object for isIpcOpen tests.
 *
 * @param connected - value for w.connected
 * @param destroyed - value for w.channel.destroyed (if channel present)
 * @returns fake child
 */
function fakeChild(connected: boolean, destroyed?: boolean): ChildProcess {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ch: any = destroyed === undefined ? undefined : { destroyed };
  return { connected, channel: ch } as unknown as ChildProcess;
}

describe('isIpcOpen', () => {
  it('returns false for undefined/null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isIpcOpen(undefined as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isIpcOpen(null as any)).toBe(false);
  });

  it('returns false when not connected', () => {
    expect(isIpcOpen(fakeChild(false, false))).toBe(false);
  });

  it('returns false when channel is destroyed', () => {
    expect(isIpcOpen(fakeChild(true, true))).toBe(false);
  });

  it('returns true when connected and channel is not destroyed', () => {
    expect(isIpcOpen(fakeChild(true, false))).toBe(true);
  });
});
