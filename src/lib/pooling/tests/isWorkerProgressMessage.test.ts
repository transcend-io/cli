import { describe, it, expect } from 'vitest';
import { isWorkerProgressMessage, type WorkerProgressMessage } from '../ipc';

/**
 * Build a progress payload.
 *
 * @param overrides - fields to override
 * @returns a progress message as unknown
 */
function makeProgress(
  overrides: Partial<WorkerProgressMessage['payload']> = {},
): unknown {
  const base = {
    type: 'progress' as const,
    payload: {
      filePath: 'file.csv',
      successDelta: 1,
      successTotal: 10,
      fileTotal: 100,
      ...overrides,
    },
  };
  return base;
}

describe('isWorkerProgressMessage', () => {
  it('returns true for a valid progress message', () => {
    const msg = makeProgress();
    expect(isWorkerProgressMessage(msg)).toBe(true);
  });

  it('requires only payload.filePath (numbers are not validated by the guard)', () => {
    // Intentionally remove the numeric fields: still true per current implementation
    const msg = makeProgress({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      successDelta: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      successTotal: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileTotal: undefined as any,
    });
    expect(isWorkerProgressMessage(msg)).toBe(true);
  });

  it('returns false when payload is missing or malformed', () => {
    expect(isWorkerProgressMessage({ type: 'progress' })).toBe(false);

    // payload present but filePath not string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad = makeProgress({ filePath: 123 } as any);
    expect(isWorkerProgressMessage(bad)).toBe(false);
  });

  it('returns false for other message types', () => {
    expect(isWorkerProgressMessage({ type: 'ready' })).toBe(false);
    expect(isWorkerProgressMessage({ type: 'result', payload: {} })).toBe(
      false,
    );
    expect(isWorkerProgressMessage(null)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isWorkerProgressMessage('progress' as any)).toBe(false);
  });
});
