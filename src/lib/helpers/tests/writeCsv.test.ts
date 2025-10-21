import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  writeCsvSync,
  appendCsvSync,
  writeCsv,
  parseFilePath,
  writeLargeCsv,
} from '../writeCsv';

/**
 *  Read file contents as string
 *
 * @param file - File path
 * @returns File contents
 */
function read(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('CSV helpers', () => {
  let dir: string;

  beforeEach(() => {
    // fresh temp dir per test file run
    dir = mkdtempSync(join(tmpdir(), 'csv-helpers-'));
  });

  // ---- parseFilePath --------------------------------------------------------
  describe('parseFilePath', () => {
    it('splits file name with extension', () => {
      const p = join(dir, 'data.csv');
      const out = parseFilePath(p);
      expect(out.baseName).toBe(p.slice(0, -4)); // strip ".csv"
      expect(out.extension).toBe('.csv');
    });

    it('defaults extension to .csv when none is present', () => {
      const p = join(dir, 'noext');
      const out = parseFilePath(p);
      expect(out.baseName).toBe(p);
      expect(out.extension).toBe('.csv');
    });
  });

  // ---- writeCsvSync + appendCsvSync (escaping) ------------------------------
  describe('writeCsvSync / appendCsvSync', () => {
    it('writes CSV with headers and proper escaping', () => {
      const file = join(dir, 'sync.csv');
      const headers = ['a', 'b'];

      const rows = [
        {
          a: 'hello, world', // comma
          b: 'He said "hi"\nthen left', // quotes + newline
        },
      ];

      writeCsvSync(file, rows, headers);

      const content = read(file);
      // Header row
      expect(content.startsWith('a,b\n')).toBe(true);
      // Escaped row: commas, quotes (double quotes), newline preserved
      expect(content.trimEnd()).toContain(
        '"hello, world","He said ""hi""\nthen left"',
      );
    });

    it('appends rows to existing CSV (adds a leading newline once)', () => {
      const file = join(dir, 'append.csv');
      const headers = ['k1', 'k2'];

      writeCsvSync(file, [{ k1: 'x', k2: 'y' }], headers);
      appendCsvSync(file, [
        { k1: 'a', k2: 'b' },
        { k1: 'c', k2: 'd' },
      ]);

      const lines = read(file).split('\n');
      expect(lines[0]).toBe('k1,k2'); // header
      expect(lines[1]).toBe('x,y'); // first row
      expect(lines[2]).toBe('a,b');
      expect(lines[3]).toBe('c,d');
    });
  });

  // ---- writeCsv (async) -----------------------------------------------------
  describe('writeCsv (async)', () => {
    it('writes with inferred headers=true', async () => {
      const file = join(dir, 'async-true.csv');
      const data = [
        { a: 1, b: 'two' },
        { a: 3, b: 'four' },
      ];
      await writeCsv(file, data, true);
      const lines = read(file).trimEnd().split('\n');
      // header + 2 rows
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('a,b');
      expect(lines[1]).toBe('1,two');
      expect(lines[2]).toBe('3,four');
    });

    it('writes with explicit header order (string[])', async () => {
      const file = join(dir, 'async-headers.csv');
      const data = [{ a: 1, b: 2 }];
      await writeCsv(file, data, ['b', 'a']);
      const lines = read(file).trimEnd().split('\n');
      expect(lines[0]).toBe('b,a');
      expect(lines[1]).toBe('2,1');
    });

    it('writes with headers=false (no header row)', async () => {
      const file = join(dir, 'async-noheader.csv');
      const data = [{ x: 'p', y: 'q' }];
      await writeCsv(file, data, false);
      const lines = read(file).trimEnd().split('\n');
      expect(lines).toEqual(['p,q']); // only one row, no header
    });
  });

  // ---- writeLargeCsv (streamed, backpressure-friendly) ----------------------
  describe('writeLargeCsv', () => {
    it('streams a large dataset into one file with explicit header order', async () => {
      const file = join(dir, 'large.csv');
      const rows = Array.from({ length: 5000 }, (_, i) => ({
        c: `c${i}`,
        a: i,
        b: i * 2,
      }));

      const written = await writeLargeCsv(file, rows, ['a', 'b', 'c']);
      expect(written).toEqual([file]);

      const lines = read(file).trimEnd().split('\n');
      // header + 5000 rows
      expect(lines.length).toBe(1 + rows.length);
      expect(lines[0]).toBe('a,b,c');
      // spot-check ordering and row content
      expect(lines[1]).toBe('0,0,c0');
      expect(lines[5000]).toBe('4999,9998,c4999');
    });

    it('handles headers=true by inferring from first row', async () => {
      const file = join(dir, 'large-infer.csv');
      const rows = [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ];
      const written = await writeLargeCsv(file, rows, true);
      expect(written).toEqual([file]);
      const lines = read(file).trimEnd().split('\n');
      expect(lines[0]).toBe('a,b');
      expect(lines[1]).toBe('1,2');
      expect(lines[2]).toBe('3,4');
    });

    it('supports headers=false (no header row)', async () => {
      const file = join(dir, 'large-noheader.csv');
      const rows = [
        { x: 'one', y: 'two' },
        { x: 'three', y: 'four' },
      ];
      await writeLargeCsv(file, rows, false);
      const lines = read(file).trimEnd().split('\n');
      // No header
      expect(lines).toEqual(['one,two', 'three,four']);
    });

    it('writes an empty file when no rows and headers=false', async () => {
      const file = join(dir, 'empty.csv');
      await writeLargeCsv(file, [], false);
      const content = read(file);
      expect(content).toBe('');
    });
  });

  // Best-effort cleanup for local runs (CI usually nukes tmp automatically)
  it('cleanup temp dir (no assertion)', () => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });
});
