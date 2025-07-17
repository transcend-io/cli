import { describe, expect, it } from 'vitest';
import { filterNullishValuesFromObject } from '../ai/filterNullishValuesFromObject';

const TEST_DATA = {
  test: 'data',
  name: true,
  cow: false,
  key: null,
  moose: null,
  str: '',
  cat: [],
  mew: { dog: 2 },
  woof: {},
};

describe('filterNullishValuesFromObject', () => {
  it('should remove links', () => {
    expect(filterNullishValuesFromObject(TEST_DATA)).to.deep.equal({
      test: 'data',
      name: true,
      cow: false,
      mew: { dog: 2 },
    });
  });
});
