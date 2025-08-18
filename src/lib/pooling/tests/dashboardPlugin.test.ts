/*
 * Tests for lib/ui/dashboardPlugin.ts
 *
 * These tests verify:
 *  1) hotkeysHint formatting for various pool sizes and final state.
 *  2) dashboardPlugin frame composition (header, workers, hotkeys, extras).
 *  3) Duplicate-frame suppression while live (no re-render when unchanged).
 *  4) Cursor hide/restore behavior and readline repaint calls.
 *  5) Extras block inclusion only when provided.
 *
 * All helper functions include explicit return types and thorough documentation.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import type { CommonCtx } from '../dashboardPlugin';
import type { ObjByString } from '@transcend-io/type-utils';

// --- Mocks -------------------------------------------------------------------

/**
 * Mock `colors` so that `colors.dim` returns the raw string (no ANSI codes).
 */
vi.mock('colors', () => ({
  default: { dim: (s: string): string => s },
  dim: (s: string): string => s,
}));

/**
 * Spy-able readline fns; we re-export spies from the factory for assertions.
 */
const mCursorTo = vi.fn(
  (/* stream: NodeJS.WriteStream, x: number, y?: number */): void => {
    // No-op, just for spying
  },
);
const mClearDown = vi.fn((/* stream: NodeJS.WriteStream */): void => {
  // No-op, just for spying
});
vi.mock('node:readline', () => ({
  cursorTo: mCursorTo,
  clearScreenDown: mClearDown,
}));

// --- Helpers -----------------------------------------------------------------

/**
 * Load the SUT module fresh to reset internal state (e.g., lastFrame cache).
 */
type SutModule = typeof import('../dashboardPlugin');

/**
 * Import the SUT fresh to reset internal module state (e.g., lastFrame cache).
 *
 * @returns a newly imported SUT module
 */
function loadSutFresh(): Promise<SutModule> {
  vi.resetModules();
  return import('../dashboardPlugin');
}

/**
 * Spy on stdout writes and expose helpers to read/clear captured output.
 *
 * @returns an object with accessors and a restore function
 */
function spyStdout(): {
  /** Spy */
  spy: ReturnType<typeof vi.spyOn>;
  /** Restore the original write implementation. */
  restore: () => void;
  /** Get all recorded write payloads as strings (in call order). */
  calls: () => string[];
  /** Clear recorded calls (without restoring). */
  clear: () => void;
} {
  const spy = vi
    .spyOn(process.stdout, 'write')
    // Return `true` per Node's stream write signature, to avoid backpressure logic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation((): boolean => true) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls = (): string[] => spy.mock.calls.map((c: any) => String(c[0]));
  const clear = (): void => {
    spy.mockClear();
  };
  const restore = (): void => spy.mockRestore();
  return { spy, restore, calls, clear };
}

/**
 * Minimal context factory for dashboardPlugin. Worker state is an empty Map —
 * sufficient for these UI-only tests and type-safe via a narrow assertion.
 *
 * @param overrides - partial overrides for defaults
 * @returns a complete ctx object suitable for dashboardPlugin
 */
function makeCtx(
  overrides: Partial<CommonCtx<ObjByString, ObjByString>> = {},
): Parameters<SutModule['dashboardPlugin']>[0] {
  const base = {
    title: 'Test Dashboard',
    poolSize: 3,
    cpuCount: 8,
    filesTotal: 10,
    filesCompleted: 2,
    filesFailed: 1,
    workerState: new Map<number, never>() as unknown as Map<number, never>,
    totals: {},
    throughput: { successSoFar: 2, r10s: 1.23, r60s: 0.9 },
    final: false,
    exportStatus: { path: '/tmp/out' },
  };
  return { ...base, ...overrides } as Parameters<
    SutModule['dashboardPlugin']
  >[0];
}

/**
 * A simple plugin for assertions; all methods return deterministic content.
 *
 * @returns a plugin object with renderHeader, renderWorkers, and renderExtras methods
 */
function makePlugin(): Parameters<SutModule['dashboardPlugin']>[1] {
  const plugin: Parameters<SutModule['dashboardPlugin']>[1] = {
    renderHeader: (ctx): string[] => [
      `=== ${ctx.title} ===`,
      `${ctx.filesCompleted}/${ctx.filesTotal} completed • failed=${ctx.filesFailed}`,
    ],
    renderWorkers: (ctx): string[] => [
      `workers: ${ctx.poolSize} • cpu=${ctx.cpuCount}`,
    ],
    renderExtras: (ctx): string[] => [
      `export: ${JSON.stringify(ctx.exportStatus)}`,
    ],
  };
  return plugin;
}

// --- Tests -------------------------------------------------------------------

describe('hotkeysHint', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('formats live hint for a single worker (digit range [0])', async () => {
    const { hotkeysHint } = await loadSutFresh();
    const s = hotkeysHint(1, false);
    expect(s).toBe(
      'Hotkeys: [0] attach • e=errors • w=warnings • i=info • l=logs • Tab/Shift+Tab • Esc/Ctrl+] detach • Ctrl+C exit',
    );
  });

  it('formats live hint with a digit range and ≥10 hint when poolSize > 10', async () => {
    const { hotkeysHint } = await loadSutFresh();
    const s = hotkeysHint(11, false);
    expect(s).toBe(
      'Hotkeys: [0-9] attach (Tab/Shift+Tab for ≥10) • e=errors • w=warnings • ' +
        'i=info • l=logs • Tab/Shift+Tab • Esc/Ctrl+] detach • Ctrl+C exit',
    );
  });

  it('formats final-state hint (no hotkey list)', async () => {
    const { hotkeysHint } = await loadSutFresh();
    const s = hotkeysHint(4, true);
    expect(s).toBe(
      'Run complete — digits to view logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • q to quit',
    );
  });
});

describe('dashboardPlugin', () => {
  const stdout = spyStdout();

  beforeEach(() => {
    stdout.clear();
    mCursorTo.mockClear();
    mClearDown.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    stdout.restore();
  });

  it('composes a full frame, hides cursor, and repaints in-place during live updates', async () => {
    const sut = await loadSutFresh();
    const ctx = makeCtx({ title: 'Uploader', poolSize: 2 });
    const plugin = makePlugin();

    sut.dashboardPlugin(ctx, plugin);

    // Cursor hidden, then frame written
    const writes = stdout.calls();
    expect(writes[0]).toBe('\x1b[?25l');

    // Readline called to position + clear screen prior to painting frame
    expect(mCursorTo).toHaveBeenCalledWith(process.stdout, 0, 0);
    expect(mClearDown).toHaveBeenCalledWith(process.stdout);

    // The final write should be the composed frame + trailing newline.
    const expectedFrame = [
      ...plugin.renderHeader(ctx),
      '',
      ...plugin.renderWorkers(ctx),
      '',
      sut.hotkeysHint(ctx.poolSize, ctx.final),
      '',
      ...(plugin.renderExtras ? plugin.renderExtras(ctx) : []),
    ].join('\n');

    expect(writes.at(-1)).toBe(`${expectedFrame}\n`);
  });

  it('suppresses duplicate frames while live (no second repaint)', async () => {
    const sut = await loadSutFresh();
    const ctx = makeCtx();
    const plugin = makePlugin();

    sut.dashboardPlugin(ctx, plugin); // initial paint
    const countAfterFirst = stdout.spy.mock.calls.length;

    sut.dashboardPlugin(ctx, plugin); // identical frame
    const countAfterSecond = stdout.spy.mock.calls.length;

    expect(countAfterSecond).toBe(countAfterFirst); // no extra writes
    expect(mCursorTo).toHaveBeenCalledTimes(1);
    expect(mClearDown).toHaveBeenCalledTimes(1);
  });

  it('always writes final frame and restores cursor, even if identical to last', async () => {
    const sut = await loadSutFresh();
    const ctxLive = makeCtx({ final: false });
    const ctxFinal = { ...ctxLive, final: true } as typeof ctxLive;
    const plugin = makePlugin();

    // Seed lastFrame with the same content by doing a live render first
    sut.dashboardPlugin(ctxLive, plugin);

    // Clear spies so we only observe the final render behavior
    stdout.clear();
    mCursorTo.mockClear();
    mClearDown.mockClear();

    sut.dashboardPlugin(ctxFinal, plugin);

    const writes = stdout.calls();
    // On final, we do NOT move the cursor or clear the screen
    expect(mCursorTo).not.toHaveBeenCalled();
    expect(mClearDown).not.toHaveBeenCalled();

    // Final render restores cursor then writes the frame
    expect(writes[0]).toBe('\x1b[?25h');

    const expectedFrame = [
      ...plugin.renderHeader(ctxFinal),
      '',
      ...plugin.renderWorkers(ctxFinal),
      '',
      sut.hotkeysHint(ctxFinal.poolSize, ctxFinal.final),
      '',
      ...(plugin.renderExtras ? plugin.renderExtras(ctxFinal) : []),
    ].join('\n');
    expect(writes.at(-1)).toBe(`${expectedFrame}\n`);
  });

  it('omits extras section entirely when plugin.renderExtras is not provided', async () => {
    const sut = await loadSutFresh();
    const ctx = makeCtx();
    const pluginNoExtras: Parameters<SutModule['dashboardPlugin']>[1] = {
      renderHeader: (c): string[] => [`H:${c.title}`],
      renderWorkers: (c): string[] => [`W:${c.poolSize}`],
      // No renderExtras
    };

    sut.dashboardPlugin(ctx, pluginNoExtras);
    const writes = stdout.calls();

    const expected = [
      ...pluginNoExtras.renderHeader(ctx),
      '',
      ...pluginNoExtras.renderWorkers(ctx),
      '',
      sut.hotkeysHint(ctx.poolSize, ctx.final),
      // No trailing '' or extras in this case
    ].join('\n');

    expect(writes.at(-1)).toBe(`${expected}\n`);
  });
});
