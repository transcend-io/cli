import { expect } from 'chai';

import { splitCsvToList } from '../index';

describe('splitCsvToList', () => {
  it('should successfully split a single string to length 1', () => {
    expect(splitCsvToList('Dog')).to.deep.equal(['Dog']);
  });

  it('should successfully split a string with commas to length 2', () => {
    expect(splitCsvToList('Dog,Cat')).to.deep.equal(['Dog', 'Cat']);
  });

  it('should successfully split a string with commas to length 2 and spaces', () => {
    expect(splitCsvToList('Dog, Cat, ')).to.deep.equal(['Dog', 'Cat']);
  });
});
