import { describe, expect, it } from 'vitest';
import { convertToEmptyStrings } from '../convertToEmptyStrings';

describe('buildDefaultCodecWrapper', () => {
  it('should correctly build a default codec for null', () => {
    const result = convertToEmptyStrings(null);
    expect(result).to.equal('');
  });

  it('should correctly build a default codec for number', () => {
    const result = convertToEmptyStrings(0);
    expect(result).to.equal('');
  });

  it('should correctly build a default codec for boolean', () => {
    const result = convertToEmptyStrings(false);
    expect(result).to.equal('');
  });

  it('should correctly build a default codec for undefined', () => {
    const result = convertToEmptyStrings(undefined);
    expect(result).to.equal('');
  });

  it('should correctly build a default codec for string', () => {
    const result = convertToEmptyStrings('1');
    expect(result).to.equal('');
  });

  it('should correctly build a default codec for an object', () => {
    const result = convertToEmptyStrings({ name: 'joe' });
    expect(result).to.deep.equal({ name: '' });
  });

  it('should correctly build a default codec for an array of primitive types', () => {
    const result = convertToEmptyStrings(['name', 0, false]);
    expect(result).to.deep.equal(['', '', '']);
  });

  it('should correctly build a default codec for an array of object', () => {
    const result = convertToEmptyStrings([
      { name: 'john', age: 52 },
      { name: 'jane', age: 15, isAdult: true },
    ]);
    // should default to the array with object if the union contains an array of objects
    expect(result).to.deep.equal([
      { name: '', age: '' },
      { name: '', age: '', isAdult: '' },
    ]);
  });
});
