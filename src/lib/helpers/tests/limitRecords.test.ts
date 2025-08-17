import { describe, it, expect } from 'vitest';
import { limitRecords } from '../limitRecords';

describe('limitRecords', () => {
  it('returns empty object for empty input', () => {
    expect(limitRecords({}, 5)).to.deep.equal({});
  });

  it('marks all entries as true when max = 0', () => {
    const input = { a: 1, b: 2, c: 3 };
    expect(limitRecords(input, 0)).to.deep.equal({ a: true, b: true, c: true });
  });

  it('retains the first N values and sets the rest to true', () => {
    const v1 = { x: 1 };
    const v2 = { y: 2 };
    const v3 = { z: 3 };
    const input = { a: v1, b: v2, c: v3 };

    const out = limitRecords(input, 2);
    expect(out).to.deep.equal({ a: v1, b: v2, c: true });
  });

  it('does not mutate the original object', () => {
    const input = { a: 1, b: 2 };
    const snapshot = { ...input };
    // eslint-disable-next-line no-void
    void limitRecords(input, 1);
    expect(input).to.deep.equal(snapshot);
  });

  it('returns the original mapping when max >= number of entries', () => {
    const input = { a: 1, b: 2 };
    const out = limitRecords(input, 5);
    expect(out).to.deep.equal(input);
  });

  it('preserves key insertion order for retained entries', () => {
    // Use non-integer-like keys to avoid numeric reordering semantics.
    const input = { alpha: 1, beta: 2, gamma: 3, delta: 4 };
    const out = limitRecords(input, 3);

    expect(Object.keys(out)).to.deep.equal(['alpha', 'beta', 'gamma', 'delta']);
    expect(out.alpha).to.equal(1);
    expect(out.beta).to.equal(2);
    expect(out.gamma).to.equal(3);
    expect(out.delta).to.equal(true);
  });
});
