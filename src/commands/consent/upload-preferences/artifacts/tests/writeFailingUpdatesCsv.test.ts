import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as fs from 'node:fs';
import {
  writeFailingUpdatesCsv,
  type FailingUpdateRow,
} from '../writeFailingUpdatesCsv';

/**
 * Mock fs BEFORE importing the SUT.
 * Use a factory that returns vi.fn()s to keep it hoist-safe.
 */
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mMkdir = vi.mocked(fs.mkdirSync);
const mWrite = vi.mocked(fs.writeFileSync);

describe('writeFailingUpdatesCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates parent dir (recursive), writes CSV with union headers in discovery order, escapes values, uses utf8, and returns outPath', () => {
    const outPath = '/tmp/exports/failing-updates.csv';

    // Two rows; the second introduces a new key `meta` (object) and omits `sourceFile`.
    // This exercises:
    //  - union header discovery order
    //  - string escaping (quotes, commas, newlines)
    //  - object → JSON.stringify + CSV escaping
    const rows: Array<FailingUpdateRow & { meta?: unknown }> = [
      {
        primaryKey: 'u1',
        uploadedAt: '2025-08-01T00:00:00Z',
        error: 'bad,"oops"', // quotes + comma
        updateJson: '{"x":1}', // string with quotes → should be doubled and quoted
        sourceFile: '/a.csv',
      },
      {
        primaryKey: 'u2',
        uploadedAt: '2025-08-02T00:00:00Z',
        error: 'E\nline', // newline
        updateJson: '{"y":2}',
        meta: { attempt: 2 }, // object → JSON.stringify then CSV-escape
      },
    ];

    const ret = writeFailingUpdatesCsv(rows, outPath);
    expect(ret).toBe(outPath);

    // mkdirSync called for parent directory with recursive: true
    expect(mMkdir).toHaveBeenCalledWith('/tmp/exports', { recursive: true });

    // Validate writeFileSync was called once with utf8
    expect(mWrite).toHaveBeenCalledTimes(1);
    expect(mWrite.mock.calls[0]?.[0]).toBe(outPath);
    expect(mWrite.mock.calls[0]?.[2]).toBe('utf8');

    const written = String(mWrite.mock.calls[0]?.[1]);

    // Header order comes from keys discovered across rows, in order:
    // from row1: primaryKey, uploadedAt, error, updateJson, sourceFile
    // from row2: meta (new key appended)
    const expectedHeader =
      'primaryKey,uploadedAt,error,updateJson,sourceFile,meta';
    expect(written.startsWith(`${expectedHeader}\n`)).toBe(true);

    // Row 1:
    //  error: bad,"oops" -> "bad,""oops"""
    //  updateJson: '{"x":1}' -> "{""x"":1}"
    const row1 = 'u1,2025-08-01T00:00:00Z,"bad,""oops""","{""x"":1}",/a.csv,';
    expect(written).toContain(`\n${row1}\n`);

    // Row 2:
    //  error: E\nline -> "E\nline"
    //  updateJson: '{"y":2}' -> "{""y"":2}"
    //  sourceFile: missing -> empty
    //  meta: { attempt: 2 } -> "{""attempt"":2}"
    const row2 =
      'u2,2025-08-02T00:00:00Z,"E\nline","{""y"":2}",,"{""attempt"":2}"';
    expect(written).toContain(row2);

    // File should end with a trailing newline
    expect(written.endsWith('\n')).toBe(true);
  });

  it('writes just a newline when rows is empty (no headers, no data)', () => {
    const outPath = '/var/tmp/empty.csv';
    const ret = writeFailingUpdatesCsv([], outPath);
    expect(ret).toBe(outPath);

    expect(mMkdir).toHaveBeenCalledWith('/var/tmp', { recursive: true });
    expect(mWrite).toHaveBeenCalledTimes(1);

    const content = String(mWrite.mock.calls[0]?.[1]);
    expect(content).toBe('\n'); // one empty header line + newline
  });
});
