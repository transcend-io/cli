import { describe, it, expect } from 'vitest';
import { classifyLogLevel } from '../logRotation';

describe('classifyLogLevel', () => {
  it('detects explicit worker tags', () => {
    expect(classifyLogLevel('[w12] WARN something')).toBe('warn');
    expect(classifyLogLevel('[w2] ERROR boom')).toBe('error');
  });

  it('detects common plain prefixes', () => {
    expect(classifyLogLevel('ERROR: bad')).toBe('error');
    expect(classifyLogLevel('ERR network fail')).toBe('error');
    expect(classifyLogLevel('FATAL crash')).toBe('error');

    expect(classifyLogLevel('WARN heads-up')).toBe('warn');
    expect(classifyLogLevel('WARNING careful')).toBe('warn');
  });

  it('detects Node runtime warnings', () => {
    expect(classifyLogLevel('(node:1234) Warning: perf issue')).toBe('warn');
    expect(classifyLogLevel('DeprecationWarning: legacy API')).toBe('warn');
  });

  it('parses JSON logs with numeric level', () => {
    expect(classifyLogLevel(JSON.stringify({ level: 50, msg: 'oops' }))).toBe(
      'error',
    );
    expect(
      classifyLogLevel(JSON.stringify({ level: 40, msg: 'heads-up' })),
    ).toBe('warn');
    expect(classifyLogLevel(JSON.stringify({ level: 10, msg: 'trace' }))).toBe(
      null,
    );
  });

  it('parses JSON logs with string level', () => {
    expect(classifyLogLevel(JSON.stringify({ level: 'error' }))).toBe('error');
    expect(classifyLogLevel(JSON.stringify({ level: 'fatal' }))).toBe('error');
    expect(classifyLogLevel(JSON.stringify({ level: 'warn' }))).toBe('warn');
    expect(classifyLogLevel(JSON.stringify({ level: 'warning' }))).toBe('warn');
    expect(classifyLogLevel(JSON.stringify({ level: 'info' }))).toBe(null);
  });

  it('detects inline WARN/ERROR words after a worker tag', () => {
    expect(classifyLogLevel('[w3] something WARNING foo')).toBe('warn');
    expect(classifyLogLevel('[w9] foo ... ERROR ...')).toBe('error');
  });

  it('strips ANSI and returns null when no match', () => {
    const ansi = '\u001b[31mred\u001b[0m plain line';
    expect(classifyLogLevel(ansi)).toBe(null);
  });
});
