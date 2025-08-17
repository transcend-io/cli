import { describe, it, expect } from 'vitest';
import { isWorkerReadyMessage } from '../ipc';

/**
 * Build a minimal "ready" message.
 *
 * @returns a valid WorkerReadyMessage as unknown
 */
function makeReady(): unknown {
  return { type: 'ready' };
}

describe('isWorkerReadyMessage', () => {
  it('returns true for a valid ready message', () => {
    const msg = makeReady();
    expect(isWorkerReadyMessage(msg)).toBe(true);
  });

  it('returns true even with extra fields (lenient check)', () => {
    const msg = { type: 'ready', extra: 123 };
    expect(isWorkerReadyMessage(msg)).toBe(true);
  });

  it('returns false for non-object or falsy', () => {
    expect(isWorkerReadyMessage(null)).toBe(false);
    expect(isWorkerReadyMessage(undefined)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isWorkerReadyMessage('ready' as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isWorkerReadyMessage(42 as any)).toBe(false);
  });

  it('returns false when type is not "ready"', () => {
    expect(isWorkerReadyMessage({ type: 'result' })).toBe(false);
    expect(isWorkerReadyMessage({ type: 'progress' })).toBe(false);
    expect(isWorkerReadyMessage({})).toBe(false);
  });
});
