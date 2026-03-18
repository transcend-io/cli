import { describe, it, expect } from 'vitest';
import { isLogNewHeader } from '../logRotation';

describe('isLogNewHeader', () => {
  it('is true for errors, warnings, worker tags, and ISO timestamps', () => {
    expect(isLogNewHeader('ERROR boom')).toBe(true);
    expect(isLogNewHeader('WARN heads-up')).toBe(true);
    expect(isLogNewHeader('[w12] something')).toBe(true);
    expect(isLogNewHeader('2024-01-02T03:04:05 more')).toBe(true);
  });

  it('is false otherwise', () => {
    expect(isLogNewHeader('plain line')).toBe(false);
  });
});
