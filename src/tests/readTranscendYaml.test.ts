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
      .throw(` ".enrichers.0.0.title expected type 'string'",
  ".enrichers.1.0.output-identifiers expected type 'Array<string>'",
  ".data-silos.0.0.title expected type 'string'",
  ".data-silos.0.1.deletion-dependencies expected type 'Array<string>'",
  ".data-silos.0.1.datapoints.0.0.key expected type 'string'",
  ".data-silos.0.1.datapoints.0.1.fields.0.0.key expected type 'string'",
  ".data-silos.1.1.disabled expected type 'boolean'"`);
  });

  it('multi-instance.yml should fail when no variables are provided', () => {
    expect(() =>
      readTranscendYaml(join(EXAMPLE_DIR, 'multi-instance.yml')),
    ).to.throw('Found variable that was not set: domain');
  });

  it('multi-instance.yml should be successful when variables are provided', () => {
    const result = readTranscendYaml(join(EXAMPLE_DIR, 'multi-instance.yml'), {
      domain: 'acme.com',
      stage: 'Staging',
    });

    expect(result!.enrichers![0].url).to.equal(
      'https://example.acme.com/transcend-enrichment-webhook',
    );
    expect(result!.enrichers![1].url).to.equal(
      'https://example.acme.com/transcend-fraud-check',
    );
    expect(result!['data-silos']![0].description).to.equal(
      'The mega-warehouse that contains a copy over all SQL backed databases - Staging',
    );
  });
});
