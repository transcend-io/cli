import { describe, it, expect } from 'vitest';
import { extractBlocks } from '../logRotation';

/**
 * Blocks should start when `starts(cleanLine)` returns true,
 * continue until a blank line or a new header-like line,
 * and should preserve original raw lines (including ANSI).
 */
describe('extractBlocks', () => {
  it('extracts error blocks and preserves raw lines', () => {
    const ansiRed = '\u001b[31m';
    const reset = '\u001b[0m';

    const text = [
      'intro line',
      `${ansiRed}ERROR critical${reset}`,
      'details 1',
      'details 2',
      '', // blank → flush
      '[w1] WARNING heads-up', // header-like → flush when next block starts
      'not part of error',
      '2024-01-02T03:04:05 more header',
      'ERROR again',
      'tail',
    ].join('\n');

    const starts = (clean: string): boolean =>
      /^\s*(ERROR|ERR|FATAL)\b/i.test(clean);

    const blocks = extractBlocks(text, starts);

    // Should capture two error blocks:
    // 1) the first ERROR with its details
    // 2) the later "ERROR again" with its tail (until end)
    expect(blocks.length).toBe(2);
    expect(blocks[0]).toContain('ERROR critical');
    expect(blocks[0]).toContain('details 1');
    expect(blocks[0]).toContain('details 2');

    expect(blocks[1]).toContain('ERROR again');
    expect(blocks[1]).toContain('tail');
  });

  it('returns empty array for empty input', () => {
    expect(extractBlocks('', () => true)).toEqual([]);
  });
});
