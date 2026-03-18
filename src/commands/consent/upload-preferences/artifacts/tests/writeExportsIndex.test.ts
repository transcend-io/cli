import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as fs from 'node:fs';
import * as nodeUrl from 'node:url';
import { writeExportsIndex } from '../writeExportsIndex';
import type { ExportStatusMap } from '../../../../../lib/pooling';

/**
 * Mock fs & url BEFORE importing the SUT.
 * Use factories that return vi.fn()s to keep mocks hoist-safe.
 */
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
vi.mock('node:url', () => ({
  // Minimal pathToFileURL stub that yields a predictable href
  pathToFileURL: vi.fn((p: string) => ({ href: `file://${p}` })),
}));

const mMkdir = vi.mocked(fs.mkdirSync);
const mWrite = vi.mocked(fs.writeFileSync);
const mPathToFileURL = vi.mocked(nodeUrl.pathToFileURL);

describe('writeExportsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined when exportsDir is not provided (no side effects)', () => {
    const out = writeExportsIndex(undefined, undefined, 'exports.index.txt');
    expect(out).toBeUndefined();
    expect(mMkdir).not.toHaveBeenCalled();
    expect(mWrite).not.toHaveBeenCalled();
  });

  it('writes index with absolute paths & URLs for each kind; placeholder paths keep raw URL; respects custom exportsFile; memoizes to avoid duplicate writes', () => {
    const exportsDir = '/exp';
    const status: ExportStatusMap = {
      // absolute path provided → used as-is
      error: { path: '/x/errors.log' },
      // undefined → falls back to join(exportsDir, 'combined-warns.log')
      warn: undefined,
      // placeholder → url should equal placeholder (no file://)
      info: { path: '(n/a)' },
      // absolute path
      all: { path: '/x/all.log' },
      // undefined → falls back to join(exportsDir, 'failing-updates.csv')
      failuresCsv: undefined,
    };

    const outPath = writeExportsIndex(exportsDir, status, 'custom.index.txt');
    expect(outPath).toBe('/exp/custom.index.txt');

    // directory creation & write
    expect(mMkdir).toHaveBeenCalledWith('/exp', { recursive: true });
    expect(mWrite).toHaveBeenCalledTimes(1);
    expect(mWrite.mock.calls[0]?.[0]).toBe('/exp/custom.index.txt');
    expect(mWrite.mock.calls[0]?.[2]).toBe('utf8');

    const written = String(mWrite.mock.calls[0]?.[1]);

    // header lines exist
    expect(written).toContain('# Export artifacts — latest paths');

    // Error: absolute path → URL via pathToFileURL
    expect(written).toContain('Errors log:');
    expect(written).toContain('path: /x/errors.log');
    expect(written).toContain('url:  file:///x/errors.log');

    // Warn: default fallback under exportsDir
    expect(written).toContain('Warnings log:');
    expect(written).toContain('path: /exp/combined-warns.log');
    expect(written).toContain('url:  file:///exp/combined-warns.log');

    // Info: placeholder → url should be identical to placeholder, no file://
    expect(written).toContain('Info log:');
    expect(written).toContain('path: (n/a)');
    expect(written).toContain('url:  (n/a)');

    // All: absolute path
    expect(written).toContain('All logs:');
    expect(written).toContain('path: /x/all.log');
    expect(written).toContain('url:  file:///x/all.log');

    // Failures CSV: fallback under exportsDir
    expect(written).toContain('Failing updates (CSV):');
    expect(written).toContain('path: /exp/failing-updates.csv');
    expect(written).toContain('url:  file:///exp/failing-updates.csv');

    // trailing newline
    expect(written.endsWith('\n')).toBe(true);

    // placeholder path should not pass through pathToFileURL
    // (We called pathToFileURL for the others though)
    const calledHrefs = mPathToFileURL.mock.calls.map((c) => c[0]);
    expect(calledHrefs).toContain('/x/errors.log');
    expect(calledHrefs).toContain('/exp/combined-warns.log');
    expect(calledHrefs).toContain('/x/all.log');
    expect(calledHrefs).toContain('/exp/failing-updates.csv');
    expect(calledHrefs).not.toContain('(n/a)');

    // Call again with identical inputs → memoization prevents a second write
    const outPath2 = writeExportsIndex(exportsDir, status, 'custom.index.txt');
    expect(outPath2).toBe('/exp/custom.index.txt');
    expect(mWrite).toHaveBeenCalledTimes(1);

    // Change content (e.g., different absolute path) → writes again
    const statusChanged: ExportStatusMap = {
      ...status,
      error: { path: '/x/errors-changed.log' },
    };
    const outPath3 = writeExportsIndex(
      exportsDir,
      statusChanged,
      'custom.index.txt',
    );
    expect(outPath3).toBe('/exp/custom.index.txt');
    expect(mWrite).toHaveBeenCalledTimes(2);
    const secondWrite = String(mWrite.mock.calls[1]?.[1]);
    expect(secondWrite).toContain('path: /x/errors-changed.log');
    expect(secondWrite).toContain('url:  file:///x/errors-changed.log');
  });
});
