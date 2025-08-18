import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { LocalContext } from '../../../../context';
import type { ChunkProgress, ChunkResult, ChunkTask } from '../worker';

// ⬇️ SUT imports AFTER mocks
import { chunkCsvPlugin } from '../ui';
import { chunkCsvParent, type ChunkCsvCommandFlags } from '../impl';

const H = vi.hoisted(() => {
  const files = ['/abs/a.csv', '/abs/b.csv', '/abs/c.csv'];

  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  };

  // capture the last runPool args so tests can assert hooks later
  const lastRunPoolArgs: {
    title?: string;
    baseDir?: string;
    childFlag?: string;
    childModulePath?: string;
    poolSize?: number;
    cpuCount?: number;
    filesTotal?: number;
    hooks?: import('../../../../lib/pooling').PoolHooks<
      ChunkTask,
      ChunkProgress,
      ChunkResult,
      Record<string, never>
    >;
    viewerMode?: boolean;
    render?: (input: unknown) => unknown;
    extraKeyHandler?: (args: {
      logsBySlot: Map<number, string[]>;
      repaint: () => void;
      setPaused: (p: boolean) => void;
    }) => unknown;
  } = {};

  const pooling = {
    CHILD_FLAG: '--child',
    computePoolSize: vi.fn(() => ({
      poolSize: 7,
      cpuCount: 10,
    })),
    // runPool will just record its args for later inspection
    runPool: vi.fn((args: typeof lastRunPoolArgs): void => {
      Object.assign(lastRunPoolArgs, args);
    }),
    dashboardPlugin: vi.fn(
      (input: unknown, plugin: unknown, viewerMode: boolean) => ({
        input,
        plugin,
        viewerMode,
        tag: 'dashboard-plugin-result',
      }),
    ),
    createExtraKeyHandler: vi.fn(
      (o: {
        logsBySlot: Map<number, string[]>;
        repaint: () => void;
        setPaused: (p: boolean) => void;
      }) => ({
        ...o,
        tag: 'extra-key-handler',
      }),
    ),
  };

  const helpers = {
    collectCsvFilesOrExit: vi.fn(() => files.slice()),
  };

  // colors.* passthrough so assertions don’t deal with ANSI codes
  const colors = {
    green: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
    cyan: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
  };

  return { files, logger, pooling, helpers, colors, lastRunPoolArgs };
});

// --- Module mocks (MUST be before importing the SUT) ---------------------------------------------
vi.mock('../../../../logger', () => ({ logger: H.logger }));

// single colors mock with default export (SUT does `import colors from 'colors'`)
vi.mock('colors', () => ({
  __esModule: true,
  default: H.colors,
  ...H.colors, // if any code uses named imports style
}));

vi.mock('../../../../lib/helpers/collectCsvFilesOrExit', () => ({
  collectCsvFilesOrExit: H.helpers.collectCsvFilesOrExit,
}));

/**
 * IMPORTANT: mock the exact module id after resolution. Using the absolute path
 * to the actual file from *this test file* is reliable for Vitest.
 */
vi.mock('../../../../lib/pooling', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../lib/pooling')
  >('../../../../lib/pooling');
  return {
    ...actual,
    CHILD_FLAG: H.pooling.CHILD_FLAG,
    computePoolSize: H.pooling.computePoolSize,
    runPool: H.pooling.runPool,
    dashboardPlugin: H.pooling.dashboardPlugin,
    createExtraKeyHandler: H.pooling.createExtraKeyHandler,
  };
});

// -------------------------------------------------------------------------------------------------

describe('chunkCsvParent', () => {
  const ctx: LocalContext = {
    exit: vi.fn(),
    log: vi.fn(),
  } as unknown as LocalContext;

  const baseFlags: ChunkCsvCommandFlags = {
    directory: '/abs',
    outputDir: '/out',
    clearOutputDir: true,
    chunkSizeMB: 100,
    concurrency: undefined,
    viewerMode: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // ensure CHILD_FLAG branch didn’t accidentally run
    expect(process.argv.includes(H.pooling.CHILD_FLAG)).toBe(false);
  });

  it('discovers files, sizes the pool, logs, builds queue, and invokes runPool with expected args', async () => {
    await chunkCsvParent.call(ctx, baseFlags);

    // collectCsvFilesOrExit called with directory + ctx
    expect(H.helpers.collectCsvFilesOrExit).toHaveBeenCalledWith(
      baseFlags.directory,
      ctx,
    );

    // pool sizing called with concurrency + number of files
    expect(H.pooling.computePoolSize).toHaveBeenCalledWith(
      undefined,
      H.files.length,
    );

    // info log includes file count and pool size text (unstyled)
    expect(H.logger.info).toHaveBeenCalledTimes(1);
    const msg = H.logger.info.mock.calls[0]?.[0];
    expect(msg).toContain(`Chunking ${H.files.length} CSV file(s)`);
    expect(msg).toContain('pool size 7');
    expect(msg).toContain('CPU=10');

    // runPool called once
    expect(H.pooling.runPool).toHaveBeenCalledTimes(1);

    const a = H.lastRunPoolArgs;
    expect(a.title).toBe('Chunk CSV');
    // baseDir prefers directory (present)
    expect(a.baseDir).toBe(baseFlags.directory);
    expect(a.childFlag).toBe(H.pooling.CHILD_FLAG);
    expect(typeof a.childModulePath).toBe('string'); // env-dependent
    expect(a.poolSize).toBe(7);
    expect(a.cpuCount).toBe(10);
    expect(a.filesTotal).toBe(H.files.length);
    expect(a.viewerMode).toBe(true);
    expect(typeof a.render).toBe('function');
    expect(typeof a.extraKeyHandler).toBe('function');
    expect(a.hooks).toBeDefined();
  });

  it('queue + hooks: nextTask/fifo, labels, totals, onProgress, onResult', async () => {
    await chunkCsvParent.call(ctx, baseFlags);
    const hooks = H.lastRunPoolArgs.hooks!;
    // nextTask drains FIFO of discovered files turned into ChunkTask
    const seen: string[] = [];
    for (;;) {
      const t = hooks.nextTask?.();
      if (!t) break;
      seen.push(t.filePath);
      // taskLabel echoes filePath
      expect(hooks.taskLabel?.(t)).toBe(t.filePath);
      // initSlotProgress returns undefined
      expect(hooks.initSlotProgress?.(t)).toBeUndefined();
    }
    expect(seen).toEqual(H.files); // FIFO order

    // totals are an empty record
    const totals = hooks.initTotals?.();
    expect(totals).toEqual({});

    // onProgress returns same totals object (identity)
    const progressed = hooks.onProgress?.(
      totals as Record<string, never>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    expect(progressed).toBe(totals);

    // onResult sets ok based on res.ok
    const r1 = hooks.onResult?.(
      totals as Record<string, never>,
      { ok: true } as ChunkResult,
    );
    expect(r1?.ok).toBe(true);
    const r2 = hooks.onResult?.(
      totals as Record<string, never>,
      { ok: false } as ChunkResult,
    );
    expect(r2?.ok).toBe(false);

    // postProcess is a no-op
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await hooks.postProcess?.({} as any);
  });

  it('render delegates to dashboardPlugin with chunkCsvPlugin and viewerMode', async () => {
    await chunkCsvParent.call(ctx, baseFlags);
    const render = H.lastRunPoolArgs.render!;
    const input = { pretend: 'frame' };
    const result = render(input);

    expect(H.pooling.dashboardPlugin).toHaveBeenCalledTimes(1);
    const call = H.pooling.dashboardPlugin.mock.calls[0];
    expect(call?.[0]).toBe(input);
    expect(call?.[1]).toBe(chunkCsvPlugin);
    expect(call?.[2]).toBe(true);

    // just assert passthrough of whatever dashboardPlugin returns
    expect(result).toEqual({
      input,
      plugin: chunkCsvPlugin,
      viewerMode: true,
      tag: 'dashboard-plugin-result',
    });
  });

  it('extraKeyHandler is built via createExtraKeyHandler and passes through logs/repaint/setPaused', async () => {
    await chunkCsvParent.call(ctx, baseFlags);
    const ek = H.lastRunPoolArgs.extraKeyHandler!;
    const logsBySlot = new Map<number, string[]>();
    const repaint = vi.fn();
    const setPaused = vi.fn();

    const out = ek({ logsBySlot, repaint, setPaused });

    expect(H.pooling.createExtraKeyHandler).toHaveBeenCalledTimes(1);
    const call = H.pooling.createExtraKeyHandler.mock.calls[0]?.[0];
    expect(call.logsBySlot).toBe(logsBySlot);
    expect(call.repaint).toBe(repaint);
    expect(call.setPaused).toBe(setPaused);

    // passthrough object from our mock
    expect(out).toEqual({
      logsBySlot,
      repaint,
      setPaused,
      tag: 'extra-key-handler',
    });
  });

  it('uses outputDir as baseDir when directory is empty', async () => {
    await chunkCsvParent.call(ctx, { ...baseFlags, directory: '' });
    expect(H.lastRunPoolArgs.baseDir).toBe(baseFlags.outputDir);
  });

  it('falls back to cwd as baseDir when directory and outputDir are empty', async () => {
    await chunkCsvParent.call(ctx, {
      ...baseFlags,
      directory: '',
      outputDir: '',
    });
    expect(H.lastRunPoolArgs.baseDir).toBe(process.cwd());
  });
});
