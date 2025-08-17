import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';

import { appendFailureLog } from '../diagnostics';
import { appendFileSync } from 'node:fs';

/**
 * Mock fs BEFORE importing the SUT.
 */
vi.mock('node:fs', () => ({
  appendFileSync: vi.fn(),
}));

const mockedAppend = vi.mocked(appendFileSync);

describe('appendFailureLog', () => {
  const FIXED = new Date('2025-01-02T03:04:05.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes a formatted failure entry to <logDir>/failures.log', () => {
    const logDir = '/var/logs';
    const workerId = 7;
    const filePath = '/tmp/file.csv';
    const errorMsg = 'Trace: boom\nat fn()';

    appendFailureLog(logDir, workerId, filePath, errorMsg);

    const expectedPath = join(logDir, 'failures.log');
    const expectedBody = `[${FIXED.toISOString()}] worker ${workerId} file=${filePath}\n${errorMsg}\n\n`;

    expect(mockedAppend).toHaveBeenCalledTimes(1);
    expect(mockedAppend).toHaveBeenCalledWith(expectedPath, expectedBody);
  });

  it('swallows append errors (does not throw)', () => {
    mockedAppend.mockImplementationOnce(() => {
      throw new Error('disk full');
    });

    expect(() => appendFailureLog('/logs', 1, '/f.csv', 'err')).not.toThrow();
  });
});
