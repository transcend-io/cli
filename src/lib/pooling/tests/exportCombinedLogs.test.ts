/* eslint-disable max-lines */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { basename, join } from 'node:path';

// Import SUT and the mocked fs fns AFTER the mock above
import { exportCombinedLogs } from '../exportCombinedLogs';
import {
  mkdirSync as _mkdirSync,
  createWriteStream as _createWriteStream,
  createReadStream as _createReadStream,
  statSync as _statSync,
} from 'node:fs';

/**
 * Mock fs BEFORE importing the SUT.
 * We provide controlled behaviors for mkdirSync, createWriteStream,
 * createReadStream, and statSync so we can assert output deterministically.
 *
 * NOTE: Use an inline mock factory (no external variables) to avoid Vitest hoisting issues.
 */
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  createWriteStream: vi.fn(),
  createReadStream: vi.fn(),
  statSync: vi.fn(),
}));

/**
 * A typed wrapper around the mocked fs functions so the rest of the test can
 * continue to use `fsMocks.*` with full intellisense and type inference.
 */
const fsMocks = {
  mkdirSync: vi.mocked(_mkdirSync),
  createWriteStream: vi.mocked(_createWriteStream),
  createReadStream: vi.mocked(_createReadStream),
  statSync: vi.mocked(_statSync),
};

/**
 * Simple in-memory "Writable" sink that captures written text.
 *
 * @returns Fake write stream with .write, .end and content accessors.
 */
function makeFakeOut(): {
  /**
   * Writes a chunk to the sink.
   *
   * @param chunk - The data to write.
   * @returns {boolean} Always true; mirrors Node's Writable#write return value.
   */
  write: (chunk: string) => boolean;
  /**
   * Ends the stream, optionally calling a callback.
   *
   * @param cb - Optional callback to invoke once the stream is ended.
   * @returns {void}
   */
  end: (cb?: () => void) => void;
  /**
   * The accumulated content written to this sink.
   *
   * @returns {string} The in-memory buffer contents.
   */
  readonly content: string;
  /**
   * True if the stream has ended, false otherwise.
   *
   * @returns {boolean} Whether .end() has been called.
   */
  readonly isEnded: boolean;
} {
  let buf = '';
  let ended = false;
  const write = vi.fn((chunk: string) => {
    buf += String(chunk);
    return true;
  });
  const end = vi.fn((cb?: () => void) => {
    ended = true;
    if (cb) cb();
  });
  return {
    write,
    end,
    /**
     * @returns The accumulated content written to this sink.
     */
    get content() {
      return buf;
    },
    /**
     * @returns True if the stream has ended, false otherwise.
     */
    get isEnded() {
      return ended;
    },
  };
}

/**
 * Configure fs mocks for a given "filesystem" view.
 *
 * - Each call to `createWriteStream` returns a fresh in-memory sink so multiple
 *   invocations of `exportCombinedLogs` in the same test do not bleed output.
 *
 * @param files - Map of path -> string content. If a path exists but is empty, set ''.
 *                Any path not present will cause statSync to throw (unavailable).
 * @returns Helpers including setters and accessors for the last write sink.
 */
function installFs(files: Record<string, string>): {
  /** Set the files to be used by the fake fs. */
  setFiles: (next: Record<string, string>) => void;
  /** Get the content written to the most recent fake output sink. */
  getWritten: () => string;
  /** Get the most recent fake output sink. */
  getOutSink: () => ReturnType<typeof makeFakeOut> | null;
} {
  const contents = new Map<string, string>(Object.entries(files));

  // Keep the most recent sink so each export call can be inspected independently.
  let currentSink: ReturnType<typeof makeFakeOut> | null = null;

  fsMocks.mkdirSync.mockImplementation(() => undefined);

  fsMocks.createWriteStream.mockImplementation(() => {
    currentSink = makeFakeOut();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return currentSink as any;
  });

  fsMocks.statSync.mockImplementation((pRaw) => {
    const p = String(pRaw);
    if (!contents.has(p)) {
      const e = new Error('ENOENT');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e as any).code = 'ENOENT';
      throw e;
    }
    const size = contents.get(p)!.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { size } as any;
  });

  fsMocks.createReadStream.mockImplementation((pRaw) => {
    const p = String(pRaw);
    // Minimal readable with .pipe and 'end' emission compatibility
    const listeners: Record<string, Array<() => void>> = {};
    const readable = {
      /**
       * Pipe content of the "file" into dest without ending it.
       *
       * @param dest - Destination writable stream.
       * @param _opts - Options (not used here).
       * @returns The destination stream.
       */
      pipe(
        dest: NodeJS.WritableStream,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _opts?: {
          /** End */
          end?: boolean;
        },
      ) {
        const body = contents.get(p) ?? '';
        dest.write(body);
        // Simulate async end event
        setTimeout(() => {
          (listeners.end || []).forEach((cb) => cb());
        }, 0);
        return dest;
      },
      /**
       * Register a one-time listener.
       *
       * @param evt - Event name (we only use 'end').
       * @param cb - Callback for the event.
       */
      once(evt: string, cb: () => void) {
        listeners[evt] ||= [];
        listeners[evt].push(cb);
      },
      /**
       * Register a listener (not used here but provided for realism).
       *
       * @param evt - Event name.
       * @param cb - Callback.
       * @returns This object for chaining.
       */
      on(evt: string, cb: () => void) {
        listeners[evt] ||= [];
        listeners[evt].push(cb);
        return this;
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return readable as any;
  });

  return {
    /**
     * Set the files to be used by the fake fs.
     *
     * @param next - Object mapping file paths to their content.
     */
    setFiles(next: Record<string, string>) {
      contents.clear();
      for (const [k, v] of Object.entries(next)) contents.set(k, v);
    },
    /**
     * Get the content written to the most recent fake output sink.
     *
     * @returns The accumulated content as a string.
     */
    getWritten() {
      return currentSink ? currentSink.content : '';
    },
    /**
     * Get the most recent fake output sink.
     *
     * @returns The sink or null if none created yet.
     */
    getOutSink() {
      return currentSink;
    },
  };
}

describe('exportCombinedLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates outDir, writes headers in worker-id order, and returns outPath', async () => {
    const { getWritten, getOutSink } = installFs({
      '/w1.info': 'W1I',
      '/w2.info': 'W2I',
    });

    const slots = new Map<number, unknown>([
      [2, { infoPath: '/w2.info' }],
      [1, { infoPath: '/w1.info' }],
    ]);

    const outDir = '/logs/out';
    const outPath = await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots as any,
      'info',
      outDir,
    );

    expect(fsMocks.mkdirSync).toHaveBeenCalledWith(outDir, { recursive: true });
    expect(outPath).toBe(join(outDir, 'combined-info.log'));

    const out = getOutSink();
    expect(out?.isEnded).toBe(true);
    const text = getWritten();

    // Worker IDs should be sorted: 1 then 2
    const idx1 = text.indexOf('==== worker 1 ====');
    const idx2 = text.indexOf('==== worker 2 ====');
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThan(idx1);

    // Should show picked file basename and contents
    expect(text).toContain(`(${basename('/w1.info')})`);
    expect(text).toContain('W1I');
    expect(text).toContain(`(${basename('/w2.info')})`);
    expect(text).toContain('W2I');
  });

  it('kind=all concatenates stdout/stderr/structured with labels, handles [empty] and [unavailable]', async () => {
    const { getWritten } = installFs({
      '/w1.out': 'OUT1',
      '/w1.err': '', // empty → [empty]
      // structured missing → [unavailable]
    });

    const slots = new Map<number, unknown>([
      [
        1,
        { outPath: '/w1.out', errPath: '/w1.err', structuredPath: undefined },
      ],
    ]);

    const text = await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots as any,
      'all',
      '/logs',
      'custom.log',
    ).then(() => getWritten());

    expect(text).toContain('==== worker 1 ====');

    // stdout section shows basename and content
    expect(text).toContain(`---- stdout (${basename('/w1.out')}) ----`);
    expect(text).toContain('OUT1');

    // stderr section shows basename and [empty]
    expect(text).toContain(`---- stderr (${basename('/w1.err')}) ----`);
    expect(text).toContain('[empty]');

    // structured section shows [unavailable]
    expect(text).toContain('---- structured ----');
    expect(text).toContain('[unavailable]');
  });

  it('error/warn/info choose the best source with fallbacks', async () => {
    const { getWritten } = installFs({
      '/err.log': 'ERR',
      '/out.log': 'OUT',
    });

    const slots = new Map<number, unknown>([
      // error: prefer errorPath, else errPath (no errorPath here → fallback to errPath)
      [1, { errPath: '/err.log' }],
      // warn: prefer warnPath, else errPath
      [2, { warnPath: '/warn.log', errPath: '/err.log' }],
      // info: prefer infoPath, else outPath (no infoPath here → fallback to outPath)
      [3, { outPath: '/out.log' }],
    ]);

    // error
    await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Map([[1, slots.get(1)]]) as any,
      'error',
      '/logs',
    );
    const tErr = getWritten();
    expect(tErr).toContain(`(${basename('/err.log')})`);
    expect(tErr).toContain('ERR');

    // warn
    await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Map([[2, slots.get(2)]]) as any,
      'warn',
      '/logs',
    );
    const tWarn = getWritten();
    // Our fake fs has no '/warn.log' content → statSync throws → should write [unavailable: path]
    expect(tWarn).toContain('(warn.log)');
    expect(tWarn).toContain('[unavailable: /warn.log]');

    // info
    await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Map([[3, slots.get(3)]]) as any,
      'info',
      '/logs',
    );
    const tInfo = getWritten();
    expect(tInfo).toContain(`(${basename('/out.log')})`);
    expect(tInfo).toContain('OUT');
  });

  it('prints "unavailable" header and body when no eligible source exists', async () => {
    const { getWritten } = installFs({});

    const slots = new Map<number, unknown>([
      [
        1,
        {
          /* no paths */
        },
      ],
    ]);

    await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots as any,
      'info',
      '/logs',
    );

    const text = getWritten();
    expect(text).toContain('(unavailable)');
    expect(text).toContain('[unavailable]');
  });

  it('when statSync throws for chosen file, writes [unavailable: <path>]', async () => {
    const { getWritten } = installFs({
      '/ok.log': 'OK',
      // '/bad.log' missing → statSync throws
    });

    const slots = new Map<number, unknown>([[1, { infoPath: '/bad.log' }]]);

    await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots as any,
      'info',
      '/logs',
    );

    const text = getWritten();
    expect(text).toContain('(bad.log)');
    expect(text).toContain('[unavailable: /bad.log]');
  });

  it('writes [empty] when file exists but has zero size', async () => {
    const { getWritten } = installFs({
      '/zero.log': '', // size 0
    });

    const slots = new Map<number, unknown>([[1, { infoPath: '/zero.log' }]]);

    await exportCombinedLogs(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots as any,
      'info',
      '/logs',
    );

    const text = getWritten();
    expect(text).toContain('(zero.log)');
    expect(text).toContain('[empty]');
  });
});
/* eslint-enable max-lines */
