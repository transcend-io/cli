import { describe, it, expect } from 'vitest';
import { isWorkerResultMessage, type WorkerProgressMessage } from '../ipc';

/**
 * Build a result message.
 *
 * @param overrides - fields to override in payload
 * @returns a result message as unknown
 */
function makeResult(
  overrides: Partial<WorkerProgressMessage['payload']> = {},
): unknown {
  const base = {
    type: 'result' as const,
    payload: {
      ok: true,
      filePath: '/abs/path.csv',
      error: undefined,
      receiptFilepath: undefined,
      ...overrides,
    },
  };
  return base;
}

describe('isWorkerResultMessage', () => {
  it('returns true for a minimal valid result (ok + filePath)', () => {
    const msg = makeResult();
    expect(isWorkerResultMessage(msg)).toBe(true);
  });

  it('returns true with optional fields (error/receiptFilepath) present', () => {
    const msg = makeResult({
      error: 'boom',
      receiptFilepath: '/receipts.json',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(isWorkerResultMessage(msg)).toBe(true);
  });

  it('returns false when ok is not boolean', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad = makeResult({ ok: 'yes' } as any);
    expect(isWorkerResultMessage(bad)).toBe(false);
  });

  it('returns false when filePath missing or not string', () => {
    const noPath = { type: 'result', payload: { ok: true } };
    expect(isWorkerResultMessage(noPath)).toBe(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrongPath = makeResult({ filePath: 123 } as any);
    expect(isWorkerResultMessage(wrongPath)).toBe(false);
  });

  it('returns false for other message types and non-objects', () => {
    expect(isWorkerResultMessage({ type: 'ready' })).toBe(false);
    expect(isWorkerResultMessage({ type: 'progress', payload: {} })).toBe(
      false,
    );
    expect(isWorkerResultMessage(null)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isWorkerResultMessage('result' as any)).toBe(false);
  });
});
