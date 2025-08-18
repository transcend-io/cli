import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';
import { mkdtemp, writeFile, readdir, readFile, rm } from 'node:fs/promises';

// SUT
import { chunkOneCsvFile } from '../chunkOneCsvFile';

// 🪝 Hoist shared logger spies to match your existing pattern
const H = vi.hoisted(() => ({
  loggerSpies: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the SAME module id the SUT imports.
// From tests → ../../logger (adjust if your relative path differs)
vi.mock('../../../logger', () => ({
  logger: H.loggerSpies,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('chunkOneCsvFile (async, streaming)', () => {
  it('splits into multiple padded chunk files and preserves headers/rows', async () => {
    // Create a temp work dir
    const work = await mkdtemp(pathJoin(tmpdir(), 'chunk-csv-'));

    // Prepare a small CSV input that will produce 2 chunks:
    // Header + three data rows; each row ~32 bytes, threshold ~70 bytes → first 2 rows in chunk 1, last row in chunk 2
    const inputCsv = [
      'colA,colB,colC',
      'xxxxxxxxxx,xxxxxxxxxx,xxxxxxxxxx',
      'xxxxxxxxxx,xxxxxxxxxx,xxxxxxxxxx',
      'xxxxxxxxxx,xxxxxxxxxx,xxxxxxxxxx',
    ].join('\n');

    const inPath = pathJoin(work, 'sample.csv');
    await writeFile(inPath, inputCsv, 'utf8');

    // Track progress calls
    const onProgress = vi.fn();

    // ~70 bytes threshold: 0.00007 MB * 1,048,576 ≈ 73.4 bytes
    await chunkOneCsvFile({
      filePath: inPath,
      outputDir: work,
      clearOutputDir: true,
      chunkSizeMB: 0.00007,
      onProgress,
    });

    // Expect two chunk files with 4-digit padding
    const files = (await readdir(work)).sort();
    const chunk1 = pathJoin(work, 'sample_chunk_0001.csv');
    const chunk2 = pathJoin(work, 'sample_chunk_0002.csv');

    expect(files).toContain('sample_chunk_0001.csv');
    expect(files).toContain('sample_chunk_0002.csv');

    // Read back and verify headers + row counts
    const c1 = await readFile(chunk1, 'utf8');
    const c2 = await readFile(chunk2, 'utf8');

    // Each chunk should include header
    const c1Lines = c1.trim().split('\n');
    const c2Lines = c2.trim().split('\n');

    // Header must match original
    expect(c1Lines[0]).toBe('colA,colB,colC');
    expect(c2Lines[0]).toBe('colA,colB,colC');

    // With our threshold, expect 2 data rows in chunk 1, 1 data row in chunk 2
    expect(c1Lines.length).toBe(1 /* header */ + 2 /* rows */);
    expect(c2Lines.length).toBe(1 /* header */ + 1 /* row */);

    // Progress callback should be called at least once with the final total (3)
    // We don't rely on the 250k periodic tick; final tick is guaranteed.
    expect(onProgress).toHaveBeenCalled();
    const last = onProgress.mock.calls.at(-1);
    expect(last?.[0]).toBe(3);

    // Optional: ensure logger.info was called with a "Chunked ..." line
    expect(H.loggerSpies.info).toHaveBeenCalledWith(
      expect.stringContaining('Chunked '),
    );

    // Cleanup
    await rm(work, { recursive: true, force: true });
  });
});
