import { describe, it, expect } from 'vitest';
import { splitInHalf } from '../splitInHalf';

describe('splitInHalf', () => {
  it('returns two empty arrays for empty input', () => {
    const [left, right] = splitInHalf([]);
    expect(left).to.deep.equal([]);
    expect(right).to.deep.equal([]);
  });

  it('splits even-length arrays evenly', () => {
    const input = [1, 2, 3, 4];
    const [left, right] = splitInHalf(input);
    expect(left).to.deep.equal([1, 2]);
    expect(right).to.deep.equal([3, 4]);
  });

  it('splits odd-length arrays with floor(mid) on the left', () => {
    const input = [1, 2, 3];
    const [left, right] = splitInHalf(input);
    expect(left).to.deep.equal([1]); // floor(3/2) = 1
    expect(right).to.deep.equal([2, 3]);
  });

  it('handles single-element arrays', () => {
    const input = [42];
    const [left, right] = splitInHalf(input);
    expect(left).to.deep.equal([]);
    expect(right).to.deep.equal([42]);
  });

  it('preserves order and does not mutate the original', () => {
    const input = ['alpha', 'beta', 'gamma', 'delta'];
    const clone = input.slice();
    const [left, right] = splitInHalf(input);

    // Original unchanged
    expect(input).to.deep.equal(clone);

    // Order preserved in both halves
    expect(left).to.deep.equal(['alpha', 'beta']);
    expect(right).to.deep.equal(['gamma', 'delta']);
  });
});
