import * as t from 'io-ts';
import chai, { expect } from 'chai';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';

import { createDefaultCodec } from '../createDefaultCodec';
import { OneTrustAssessmentQuestionResponseCodec } from '../../oneTrust/codecs';

chai.use(deepEqualInAnyOrder);

describe('buildDefaultCodec', () => {
  it('should correctly build a default codec for null', () => {
    const result = createDefaultCodec(t.null);
    expect(result).to.equal(null);
  });

  it('should correctly build a default codec for number', () => {
    const result = createDefaultCodec(t.number);
    expect(result).to.equal(null);
  });

  it('should correctly build a default codec for boolean', () => {
    const result = createDefaultCodec(t.boolean);
    expect(result).to.equal(null);
  });

  it('should correctly build a default codec for undefined', () => {
    const result = createDefaultCodec(t.undefined);
    expect(result).to.equal(undefined);
  });

  it('should correctly build a default codec for string', () => {
    const result = createDefaultCodec(t.string);
    expect(result).to.equal('');
  });

  it('should correctly build a default codec for a union with null', () => {
    const result = createDefaultCodec(t.union([t.string, t.null]));
    // should default to null if the union contains null
    expect(result).to.equal(null);
  });

  it('should correctly build a default codec for a union with type', () => {
    const result = createDefaultCodec(
      t.union([t.string, t.null, t.type({ name: t.string })]),
    );
    // should default to the type if the union contains a type
    expect(result).to.deep.equal({ name: '' });
  });

  it('should correctly build a default codec for a union without null', () => {
    const result = createDefaultCodec(t.union([t.string, t.number]));
    // should default to the first value if the union does not contains null
    expect(result).to.equal('');
  });

  it('should correctly build a default codec for an array of object types', () => {
    const result = createDefaultCodec(
      t.array(t.type({ name: t.string, age: t.number })),
    );
    // should default to the first value if the union does not contains null
    expect(result).to.deep.equalInAnyOrder([{ name: '', age: null }]);
  });

  it('should correctly build a default codec for an array of object partials', () => {
    const result = createDefaultCodec(
      t.array(t.partial({ name: t.string, age: t.number })),
    );
    // should default to the first value if the union does not contains null
    expect(result).to.deep.equalInAnyOrder([{ name: '', age: null }]);
  });

  it('should correctly build a default codec for an array of object intersections', () => {
    const result = createDefaultCodec(
      t.array(
        t.intersection([
          t.partial({ name: t.string, age: t.number }),
          t.type({ city: t.string }),
        ]),
      ),
    );
    // should default to the first value if the union does not contains null
    expect(result).to.deep.equalInAnyOrder([{ name: '', age: null, city: '' }]);
  });

  it('should correctly build a default codec for an array of strings', () => {
    const result = createDefaultCodec(t.array(t.string));
    // should default to the first value if the union does not contains null
    expect(result).to.deep.equal([]);
  });

  it('should correctly build a default codec for an intersection', () => {
    const result = createDefaultCodec(
      t.intersection([
        t.type({ id: t.string, name: t.string }),
        t.partial({ age: t.number }),
      ]),
    );
    // should default to the first value if the union does not contains null
    expect(result).to.deep.equalInAnyOrder({ id: '', name: '', age: null });
  });
  it.only('should correctly build a default codec for an intersection', () => {
    const result = createDefaultCodec(
      t.array(OneTrustAssessmentQuestionResponseCodec),
    );

    console.log({ result: JSON.stringify(result, null, 2) });
  });
});
