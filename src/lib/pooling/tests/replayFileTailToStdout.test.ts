import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createReadStream, statSync } from 'node:fs';
import { replayFileTailToStdout } from '../replayFileTailToStdout';

/**
 * Mock fs BEFORE importing the SUT.
 * Inline factory avoids hoisting pitfalls.
 */
vi.mock('node:fs', () => ({
  createReadStream: vi.fn(),
  statSync: vi.fn(),
}));

const mCRS = vi.mocked(createReadStream);
const mStat = vi.mocked(statSync);

/**
 * Type for createReadStream return value.
 */
type CRSRet = ReturnType<typeof createReadStream>;

/**
 * A tiny fake readable that supports `.on('data'|'end'|'error')`
 * and helpers to emit those events later in the test.
 *
 * @returns a readable-like object
 */
function makeFakeStream(): CRSRet {
  const handlers: Record<string, Array<(...a: unknown[]) => void>> = {
    data: [],
    end: [],
    error: [],
  };
  const stream = {
    /**
     * Pipe method to simulate readable stream
     *
     * @param evt  - unused
     * @param cb - unused
     * @returns this
     */
    on(evt: string, cb: (...a: unknown[]) => void) {
      handlers[evt] ||= [];
      handlers[evt].push(cb);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this as any;
    },
    /**
     * Emit a chunk to all listeners
     *
     * @param chunk - data chunk
     */
    emitData(chunk: string) {
      handlers.data.forEach((cb) => cb(chunk));
    },
    /**
     *
     */
    emitEnd() {
      handlers.end.forEach((cb) => cb());
    },
    /**
     * Emit an error to all listeners
     *
     * @param err - error to emit
     */
    emitError(err: unknown) {
      handlers.error.forEach((cb) => cb(err));
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return stream as any as CRSRet;
}

/**
 * Install a simple file map and default createReadStream behavior:
 * - statSync returns size based on string length
 * - createReadStream emits the substring from `start` to end, then 'end'
 *
 * @param files - mapping path -> file content
 * @returns helper to change files
 */
function installFs(files: Record<string, string>): {
  /**
   * Replace the current file map.
   *
   * @param next - mapping path -> file content
   * @returns nothing
   */
  setFiles(next: Record<string, string>): void;
} {
  let store = { ...files };

  mStat.mockImplementation((pRaw) => {
    const p = String(pRaw);
    const s = store[p];
    if (s === undefined) {
      const e = new Error('ENOENT');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e as any).code = 'ENOENT';
      throw e;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { size: s.length } as any;
  });

  mCRS.mockImplementation((pRaw, optsRaw) => {
    const opts = optsRaw as {
      /** Stat */
      start?: number;
      /** Encoding */
      encoding?: string;
    };
    const p = String(pRaw);
    const start = Math.max(0, Number(opts?.start ?? 0));
    const enc = opts?.encoding;
    expect(enc).toBe('utf8'); // SUT should request utf8

    const s = store[p] ?? '';
    const chunk = s.slice(start);

    const st = makeFakeStream();
    // Emit after listeners are likely attached
    setTimeout(() => {
      if (chunk.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (st as any).emitData(chunk);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (st as any).emitEnd();
    }, 0);
    return st as CRSRet;
  });

  return {
    /**
     * Replace the current file map.
     *
     * @param next - mapping path -> file content
     */
    setFiles(next: Record<string, string>) {
      store = { ...next };
    },
  };
}

describe('replayFileTailToStdout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads tail bytes from the end (size - maxBytes) and writes them', async () => {
    installFs({ '/file.txt': 'HELLOWORLD' }); // size = 10
    const writes: string[] = [];
    const write = (s: string): number => writes.push(s);

    await replayFileTailToStdout('/file.txt', 4, write);

    // expect createReadStream called with start = 10 - 4 = 6
    expect(mCRS).toHaveBeenCalledWith(
      '/file.txt',
      expect.objectContaining({ start: 6, encoding: 'utf8' }),
    );
    expect(writes.join('')).toBe('ORLD');
  });

  it('starts at 0 when file is shorter than maxBytes', async () => {
    installFs({ '/short.log': 'hi' }); // size = 2
    const writes: string[] = [];
    const write = (s: string): number => writes.push(s);

    await replayFileTailToStdout('/short.log', 100, write);

    expect(mCRS).toHaveBeenCalledWith(
      '/short.log',
      expect.objectContaining({ start: 0, encoding: 'utf8' }),
    );
    expect(writes.join('')).toBe('hi');
  });

  it('resolves without writing when statSync throws (missing file)', async () => {
    installFs({}); // no files
    const write = vi.fn();

    await replayFileTailToStdout('/missing.txt', 50, write);

    expect(write).not.toHaveBeenCalled();
  });

  it('resolves when the stream emits an error (without throwing)', async () => {
    // Provide a size so statSync succeeds
    mStat.mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { size: 5 } as any,
    );

    mCRS.mockImplementationOnce(() => {
      const st = makeFakeStream();
      // emit only 'error'
      setTimeout(() => {
        // @ts-expect-error custom helper
        st.emitError(new Error('boom'));
      }, 0);
      return st;
    });

    const write = vi.fn();
    await replayFileTailToStdout('/err.txt', 3, write);

    expect(write).not.toHaveBeenCalled();
  });

  it('writes multiple chunks when the stream emits multiple data events', async () => {
    // Stat says size = 6 so start = 6 - 6 = 0 (we will emit custom chunks anyway)
    mStat.mockReturnValueOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { size: 6 } as any,
    );

    mCRS.mockImplementationOnce((_, optsRaw) => {
      const opts = optsRaw as {
        /** Stat */
        start?: number;
        /** Encoding */
        encoding?: string;
      };
      expect(opts?.encoding).toBe('utf8');
      const st = makeFakeStream();
      setTimeout(() => {
        // @ts-expect-error custom helper
        st.emitData('AA');
        // @ts-expect-error custom helper
        st.emitData('BB');
        // @ts-expect-error custom helper
        st.emitEnd();
      }, 0);
      return st;
    });

    const writes: string[] = [];
    const write = (s: string): number => writes.push(s);

    await replayFileTailToStdout('/multi.txt', 6, write);

    expect(writes).toEqual(['AA', 'BB']);
  });
});
