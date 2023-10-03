import { expect } from 'chai';

import { filterNullValuesFromObject } from '../ai/filterNullValuesFromObject';

const TEST_DATA = {
  test: 'data',
  name: true,
  cow: false,
  key: null,
  moose: null,
  str: '',
  cat: [],
};

describe('filterNullValuesFromObject', () => {
  it('should remove links', () => {
    expect(filterNullValuesFromObject(TEST_DATA)).to.deep.equal({
      test: 'data',
      name: true,
      cow: false,
      cat: [],
    });
  });
});
