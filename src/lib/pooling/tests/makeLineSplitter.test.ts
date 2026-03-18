import { describe, it, expect } from 'vitest';
import { makeLineSplitter } from '../logRotation';

describe('makeLineSplitter', () => {
  it('emits one line per newline across chunk boundaries', () => {
    const lines: string[] = [];
    const split = makeLineSplitter((l) => lines.push(l));

    split('hello\nwor');
    split('ld\nnext\nlast');
    split(' piece\n');

    expect(lines).toEqual(['hello', 'world', 'next', 'last piece']);
  });

  it('does not emit a partial last line without newline', () => {
    const lines: string[] = [];
    const split = makeLineSplitter((l) => lines.push(l));

    split('abc'); // no newline yet
    split('def\n'); // first newline
    split('tail-without-newline');

    expect(lines).toEqual(['abcdef']);
  });
});
