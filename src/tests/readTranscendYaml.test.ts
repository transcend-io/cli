import { expect } from 'chai';
import { join } from 'path';

import { readTranscendYaml } from '../index';

const EXAMPLE_DIR = join(__dirname, '..', '..', 'examples');

describe('readTranscendYaml', () => {
  it('simple.yml should pass the codec validation for TranscendInput', () => {
    expect(() =>
      readTranscendYaml(join(EXAMPLE_DIR, 'simple.yml')),
    ).to.not.throw();
  });

  it('invalid.yml should fail the codec validation for TranscendInput', () => {
    expect(() => readTranscendYaml(join(EXAMPLE_DIR, 'invalid.yml'))).to
      .throw(`".enrichers.0.0.title expected type 'string'",
  ".enrichers.1.0.input-identifier expected type 'string'",
  ".enrichers.1.0.output-identifiers expected type 'Array<string>'",
  ".data-silos.0.0.title expected type 'string'",
  ".data-silos.0.1.deletion-dependencies expected type 'Array<string>'",
  ".data-silos.0.1.objects.0.0.title expected type 'string'",
  ".data-silos.0.1.objects.0.1.fields.0.0.key expected type 'string'",
  ".data-silos.1.1.disabled expected type 'boolean'"`);
  });
});
