import { describe, it, expect } from 'vitest';
import { getErrorStatus } from '../getErrorStatus';

describe('getErrorStatus', () => {
  it('returns undefined when given undefined', () => {
    expect(getErrorStatus(undefined)).to.equal(undefined);
  });

  it('returns response.statusCode when present', () => {
    const err = { response: { statusCode: 429 } };
    expect(getErrorStatus(err)).to.equal(429);
  });

  it('falls back to response.status when statusCode is absent', () => {
    const err = { response: { status: 502 } };
    expect(getErrorStatus(err)).to.equal(502);
  });

  it('prefers statusCode over status when both exist', () => {
    const err = { response: { statusCode: 400, status: 418 } };
    expect(getErrorStatus(err)).to.equal(400);
  });

  it('returns undefined when response exists but has neither statusCode nor status', () => {
    const err = { response: { body: 'no status fields here' } };
    expect(getErrorStatus(err)).to.equal(undefined);
  });

  it('works when attached to an Error instance (got-style)', () => {
    const err = Object.assign(new Error('boom'), {
      response: { statusCode: 503 },
    });
    expect(getErrorStatus(err)).to.equal(503);
  });
});
