import { describe, it, expect, vi } from 'vitest';
import { safeSend } from '../spawnWorkerProcess';
import type { ChildProcess } from 'node:child_process';

/**
 * Make a ChildProcess-shaped object.
 *
 * @param connected - connected flag
 * @param destroyed - channel.destroyed flag
 * @param impl - optional send implementation
 * @returns fake child
 */
function makeChild(
  connected: boolean,
  destroyed: boolean,
  impl?: (msg: unknown) => unknown,
): ChildProcess {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const child: any = {
    connected,
    channel: { destroyed },
    send: impl ?? vi.fn(),
  };
  return child as unknown as ChildProcess;
}

describe('safeSend', () => {
  it('returns false and does not call send when IPC is closed', () => {
    const c = makeChild(false, true);
    const ok = safeSend(c, { hello: 'world' });
    expect(ok).toBe(false);
    expect(c.send).not.toHaveBeenCalled();
  });

  it('returns true when IPC open and send succeeds', () => {
    const send = vi.fn();
    const c = makeChild(true, false, send);
    const msg = { t: 'x' };
    const ok = safeSend(c, msg);
    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledWith(msg);
  });

  it.each([
    {
      label: 'ERR_IPC_CHANNEL_CLOSED',
      err: Object.assign(new Error('x'), { code: 'ERR_IPC_CHANNEL_CLOSED' }),
    },
    { label: 'EPIPE', err: Object.assign(new Error('x'), { code: 'EPIPE' }) },
    { label: 'errno -32', err: Object.assign(new Error('x'), { errno: -32 }) },
  ])('returns false on recoverable send error: %s', ({ err }) => {
    const send = vi.fn(() => {
      throw err;
    });
    const c = makeChild(true, false, send);
    const ok = safeSend(c, { t: 1 });
    expect(ok).toBe(false);
  });

  it('rethrows unknown send errors', () => {
    const boom = new Error('boom');
    const send = vi.fn(() => {
      throw boom;
    });
    const c = makeChild(true, false, send);
    expect(() => safeSend(c, { t: 2 })).toThrow(boom);
  });
});
