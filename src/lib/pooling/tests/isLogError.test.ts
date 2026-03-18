import { describe, it, expect } from 'vitest';
import { isLogError } from '../logRotation';

describe('isLogError', () => {
  it('matches ERROR and runtime fatal indicators', () => {
    expect(isLogError('something ERROR happened')).toBe(true);
    expect(isLogError('uncaughtException in module')).toBe(true);
    expect(isLogError('unhandledRejection promise')).toBe(true);
  });

  it('does not match non-errors', () => {
    expect(isLogError('WARN only')).toBe(false);
    expect(isLogError('ok')).toBe(false);
  });
});
