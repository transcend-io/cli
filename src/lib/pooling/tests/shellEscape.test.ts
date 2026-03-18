import { describe, it, expect } from 'vitest';
import { shellEscape } from '../openTerminal';

describe('shellEscape', () => {
  it('wraps simple strings in single quotes', () => {
    expect(shellEscape('abc')).toBe("'abc'");
  });

  it('escapes single quotes using the standard POSIX pattern', () => {
    // O'Reilly -> 'O'\''Reilly'
    expect(shellEscape("O'Reilly")).toBe("'O'\\''Reilly'");
  });

  it('escapes multiple single quotes in the string', () => {
    expect(shellEscape("a'b'c")).toBe("'a'\\''b'\\''c'");
  });

  it('handles empty strings', () => {
    expect(shellEscape('')).toBe("''");
  });

  it('coerces non-string inputs safely', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(shellEscape(123 as any)).toBe("'123'");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(shellEscape(null as any as unknown as string)).toBe("'null'");
  });
});
