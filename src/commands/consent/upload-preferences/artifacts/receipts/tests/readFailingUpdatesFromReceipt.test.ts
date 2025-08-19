import { describe, it, expect, vi, beforeEach } from 'vitest';

import { readFailingUpdatesFromReceipt } from '../readFailingUpdatesFromReceipt';

const H = vi.hoisted(() => ({
  readFileSync: vi.fn() as unknown as (path: string, enc: string) => string,
}));

// mock MUST come before importing SUT
vi.mock('node:fs', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readFileSync: (...a: unknown[]) => (H.readFileSync as any)(...a),
}));

describe('readFailingUpdatesFromReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses failing updates (happy path) and includes sourceFile', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce(
      JSON.stringify({
        failingUpdates: {
          'pk-1': {
            uploadedAt: '2025-08-15T00:00:00.000Z',
            error: 'Bad thing',
            update: { purpose: 'Marketing', enabled: false },
          },
          'pk-2': {
            uploadedAt: '2025-08-16T10:11:12.000Z',
            error: 'Oops',
            update: { purpose: 'Email', enabled: true },
          },
        },
      }),
    );

    const out = readFailingUpdatesFromReceipt(
      '/path/receipts.json',
      '/src/file.csv',
    );

    expect(out).toEqual([
      {
        primaryKey: 'pk-1',
        uploadedAt: '2025-08-15T00:00:00.000Z',
        error: 'Bad thing',
        updateJson: JSON.stringify({ purpose: 'Marketing', enabled: false }),
        sourceFile: '/src/file.csv',
      },
      {
        primaryKey: 'pk-2',
        uploadedAt: '2025-08-16T10:11:12.000Z',
        error: 'Oops',
        updateJson: JSON.stringify({ purpose: 'Email', enabled: true }),
        sourceFile: '/src/file.csv',
      },
    ]);

    expect(H.readFileSync).toHaveBeenCalledWith('/path/receipts.json', 'utf8');
  });

  it('fills defaults when fields are missing and omits updateJson when update is absent', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce(
      JSON.stringify({
        failingUpdates: {
          'pk-1': {}, // all missing -> defaults
          'pk-2': { uploadedAt: 'X' }, // partial
        },
      }),
    );

    const out = readFailingUpdatesFromReceipt('/path/receipts.json');

    expect(out).toEqual([
      {
        primaryKey: 'pk-1',
        uploadedAt: '',
        error: '',
        updateJson: '',
        sourceFile: undefined,
      },
      {
        primaryKey: 'pk-2',
        uploadedAt: 'X',
        error: '',
        updateJson: '',
        sourceFile: undefined,
      },
    ]);
  });

  it('returns [] when failingUpdates is empty object', () => {
    H.readFileSync = vi
      .fn()
      .mockReturnValueOnce(JSON.stringify({ failingUpdates: {} }));
    const out = readFailingUpdatesFromReceipt('/path/receipts.json');
    expect(out).toEqual([]);
  });

  it('returns [] when failingUpdates key is missing entirely', () => {
    H.readFileSync = vi
      .fn()
      .mockReturnValueOnce(JSON.stringify({ someOtherKey: 1 }));
    const out = readFailingUpdatesFromReceipt('/path/receipts.json');
    expect(out).toEqual([]);
  });

  it('returns [] on invalid JSON', () => {
    H.readFileSync = vi.fn().mockReturnValueOnce('{not json}');
    const out = readFailingUpdatesFromReceipt('/path/receipts.json');
    expect(out).toEqual([]);
  });

  it('returns [] when readFileSync throws', () => {
    H.readFileSync = vi.fn(() => {
      throw new Error('ENOENT');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    const out = readFailingUpdatesFromReceipt('/path/missing.json');
    expect(out).toEqual([]);
  });
});
