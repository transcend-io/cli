import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from '../extractErrorMessage';

describe('extractErrorMessage', () => {
  it('returns "Unknown error" when given undefined', () => {
    expect(extractErrorMessage(undefined)).to.equal('Unknown error');
  });

  it('returns err.message when no response.body is present', () => {
    const err = new Error('simple failure');
    expect(extractErrorMessage(err)).to.equal('simple failure');
  });

  it('prefers response.body over err.message when both exist (non-JSON body)', () => {
    const err = {
      message: 'fallback message',
      response: { body: 'raw server text' },
    };
    expect(extractErrorMessage(err)).to.equal('raw server text');
  });

  it('parses JSON body with error.message', () => {
    const err = {
      response: {
        body: JSON.stringify({ error: { message: 'Bad request' } }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('Bad request');
  });

  it('parses JSON body with top-level errors as strings', () => {
    const err = {
      response: {
        body: JSON.stringify({ errors: ['First issue', 'Second issue'] }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('First issue, Second issue');
  });

  it('parses JSON body with error.errors as strings', () => {
    const err = {
      response: {
        body: JSON.stringify({
          error: { errors: ['Rate limited', 'Try later'] },
        }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('Rate limited, Try later');
  });

  it('filters falsy items when joining errors array', () => {
    const err = {
      response: {
        body: JSON.stringify({ errors: ['One', '', null, undefined, 'Two'] }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('One, Two');
  });

  it('leaves non-JSON response bodies as-is', () => {
    const err = {
      response: {
        body: '<html>Internal Error</html>',
      },
    };
    expect(extractErrorMessage(err)).to.equal('<html>Internal Error</html>');
  });

  it('documents current behavior for errors as array of objects (joins as [object Object])', () => {
    const err = {
      response: {
        body: JSON.stringify({
          errors: [{ message: 'Alpha' }, { message: 'Beta' }],
        }),
      },
    };
    // NOTE: Current implementation does not unwrap .message from objects,
    // so it will stringify to "[object Object], [object Object]".
    expect(extractErrorMessage(err)).to.equal(
      '[object Object], [object Object]',
    );
  });
});
