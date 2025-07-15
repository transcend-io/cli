import { expect } from 'chai';
import inquirer from 'inquirer';

import { fuzzyMatchColumns, fuzzySearch, NONE } from '../index';

describe('fuzzyMatchColumns', () => {
  it('should successfully fuzzy search', () => {
    expect(fuzzySearch('Dog', 'g-dog')).to.equal(true);
  });

  it('should successfully fuzzy search inverted', () => {
    expect(fuzzySearch('g-dog', 'Dog')).to.equal(true);
  });

  it('should not fuzzy search', () => {
    expect(fuzzySearch('dog', 'cat')).to.equal(false);
  });

  it('parse out fuzzy search suggestions required', () => {
    expect(
      fuzzyMatchColumns(['dog', 'cat', 'cat-dog'], 'dog', true),
    ).to.deep.equal(['dog', 'cat-dog', new inquirer.Separator(), 'cat']);
  });

  it('parse out fuzzy search suggestions not required', () => {
    expect(
      fuzzyMatchColumns(['dog', 'cat', 'cat-dog'], 'dog', false),
    ).to.deep.equal(['dog', 'cat-dog', new inquirer.Separator(), NONE, 'cat']);
  });
});
