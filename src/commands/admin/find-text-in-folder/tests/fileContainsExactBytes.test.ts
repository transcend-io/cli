import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { fileContainsExactBytes } from '../impl';

const TMP = path.join(os.tmpdir(), 'find-text-in-folder-tests');

function tmpFile(name: string, content: string): string {
  fs.mkdirSync(TMP, { recursive: true });
  const fp = path.join(TMP, name);
  fs.writeFileSync(fp, content, 'utf8');
  return fp;
}

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe('fileContainsExactBytes', () => {
  it('finds a needle in a small file (case-insensitive)', async () => {
    const fp = tmpFile('basic.txt', 'Hello World\nfoo bar baz\n');
    const needle = Buffer.from('foo bar', 'utf8');
    expect(await fileContainsExactBytes(fp, needle)).toBe(true);
  });

  it('returns false when needle is absent', async () => {
    const fp = tmpFile('miss.txt', 'nothing interesting here');
    const needle = Buffer.from('zebra', 'utf8');
    expect(await fileContainsExactBytes(fp, needle)).toBe(false);
  });

  it('handles case-insensitive matching (needle must be pre-lowered)', async () => {
    const fp = tmpFile('upper.csv', 'Name,Email\nJohn,JOHN@EXAMPLE.COM\n');
    const needle = Buffer.from('john@example.com', 'utf8');
    expect(await fileContainsExactBytes(fp, needle)).toBe(true);
  });

  it('respects maxBytes and stops scanning', async () => {
    const fp = tmpFile('big.txt', `${'A'.repeat(100)}SECRET${'B'.repeat(100)}`);
    const needle = Buffer.from('secret', 'utf8');

    expect(await fileContainsExactBytes(fp, needle, 50)).toBe(false);

    expect(await fileContainsExactBytes(fp, needle, 200)).toBe(true);
  });

  it('detects needle that spans a chunk boundary', async () => {
    const size = 64 * 1024;
    const padding = 'x'.repeat(size - 3);
    const content = `${padding}SECRET${'y'.repeat(100)}`;
    const fp = tmpFile('boundary.txt', content);
    const needle = Buffer.from('secret', 'utf8');
    expect(await fileContainsExactBytes(fp, needle)).toBe(true);
  });

  it('returns false for an empty file', async () => {
    const fp = tmpFile('empty.txt', '');
    const needle = Buffer.from('anything', 'utf8');
    expect(await fileContainsExactBytes(fp, needle)).toBe(false);
  });
});
