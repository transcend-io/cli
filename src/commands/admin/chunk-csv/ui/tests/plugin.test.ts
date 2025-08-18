import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mMakeHeader = vi.fn<(ctx: unknown, extras?: string[]) => string[]>();
const mMakeWorkerRows = vi.fn<(ctx: unknown) => string[]>();

vi.mock('../../../../../lib/pooling', () => ({
  makeHeader: (...args: unknown[]) =>
    mMakeHeader(...(args as [unknown, string[]?])),
  makeWorkerRows: (ctx: unknown) => mMakeWorkerRows(ctx),
  // the plugin only uses the two above; other exports unnecessary for this test
}));

/* Import SUT *after* mocks are registered */
const { chunkCsvPlugin } = await import('../plugin');

function makeCtx(): unknown {
  // The delegator does not access fields; it just forwards to mocked fns.
  // Keep this minimal to avoid coupling to CommonCtx.
  return { any: 'ctx' };
}

describe('chunkCsvPlugin delegator', () => {
  beforeEach(() => {
    mMakeHeader.mockReset();
    mMakeWorkerRows.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  it('renderHeader calls makeHeader(ctx) with no extraLines and returns its result', () => {
    const ctx = makeCtx();
    mMakeHeader.mockReturnValue(['H1', 'H2']);

    const out = chunkCsvPlugin.renderHeader(ctx as never);

    expect(mMakeHeader).toHaveBeenCalledTimes(1);
    // Called with exactly one argument (no extras param)
    expect(mMakeHeader).toHaveBeenCalledWith(ctx);
    const [args] = mMakeHeader.mock.calls;
    expect(args).toHaveLength(1);

    expect(out).toEqual(['H1', 'H2']);
  });

  it('renderWorkers calls makeWorkerRows(ctx) and returns its result', () => {
    const ctx = makeCtx();
    mMakeWorkerRows.mockReturnValue(['R1', 'R2', 'R3']);

    const rows = chunkCsvPlugin.renderWorkers(ctx as never);

    expect(mMakeWorkerRows).toHaveBeenCalledTimes(1);
    expect(mMakeWorkerRows).toHaveBeenCalledWith(ctx);
    expect(rows).toEqual(['R1', 'R2', 'R3']);
  });

  it('exposes only header/workers (no extras renderer)', () => {
    // Ensure the delegator does not define renderExtras
    expect(
      Object.prototype.hasOwnProperty.call(chunkCsvPlugin, 'renderExtras'),
    ).toBe(false);
    // And accessing it is undefined
    expect(
      (chunkCsvPlugin as unknown as Record<string, unknown>).renderExtras,
    ).toBeUndefined();
  });
});
