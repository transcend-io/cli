import { expect } from 'chai';

import { splitToCsv } from '../index';

describe('splitToCsv', () => {
  it('should successfully split a single string to length 1', () => {
    expect(splitToCsv('Dog')).to.deep.equal(['Dog']);
  });

  it('should successfully split a string with commas to length 2', () => {
    expect(splitToCsv('Dog,Cat')).to.deep.equal(['Dog', 'Cat']);
  });

  it('should successfully split a string with commas to length 2 and spaces', () => {
    expect(splitToCsv('Dog, Cat, ')).to.deep.equal(['Dog', 'Cat']);
  });
});
