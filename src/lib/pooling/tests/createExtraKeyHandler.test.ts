/* eslint-disable max-lines */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import type { ExportStatusMap } from '../logRotation';
import type { SlotPaths } from '../spawnWorkerProcess';

/**
 * Mock the combined logs viewer. We assert calls and control resolution/rejection.
 */
const mShowCombinedLogs = vi.fn(() => Promise.resolve());
vi.mock('../showCombinedLogs', () => ({
  showCombinedLogs: mShowCombinedLogs,
}));

/**
 * Sub module
 */
type SutModule = typeof import('../createExtraKeyHandler');

/**
 * Import the SUT fresh.
 *
 * @returns Newly imported module.
 */
function loadSutFresh(): Promise<SutModule> {
  vi.resetModules();
  return import('../createExtraKeyHandler');
}

/**
 * Spy on process.stdout.write and expose helpers.
 *
 * @returns An object with the spy and helpers to inspect/clear/restore it.
 */
function spyStdout(): {
  /** The spy instance. */
  spy: ReturnType<typeof vi.spyOn>;
  /** Restore the original implementation. */
  restore: () => void;
  /** All write payloads coerced to string. */
  calls: () => string[];
  /** Clear recorded calls. */
  clear: () => void;
} {
  const spy = vi
    .spyOn(process.stdout, 'write')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation((): any => true) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls = (): string[] => spy.mock.calls.map((c: any) => String(c[0]));

  const clear = (): void => spy.mockClear();
  const restore = (): void => spy.mockRestore();
  return { spy, restore, calls, clear };
}

// --- Helpers -----------------------------------------------------------------

/**
 * Minimal SlotPaths stub for tests. Only the identity matters for forwarding.
 *
 * @returns A SlotPaths-like object.
 */
function makeLogs(): SlotPaths {
  return { any: 'paths' } as unknown as SlotPaths;
}

/**
 * Create a fresh export status map.
 *
 * @returns A mutable ExportStatusMap-like object.
 */
function makeExportStatus(): ExportStatusMap {
  // The SUT only requires index access with { path, savedAt, exported }
  return {} as unknown as ExportStatusMap;
}

/**
 * Create spies for repaint/pause callbacks.
 *
 * @returns Functions used by the SUT and the underlying spies.
 */
function makeUiSpies(): {
  /** repaint function provided to SUT */
  repaint: () => void;
  /** setPaused function provided to SUT */
  setPaused: (p: boolean) => void;
  /** spy for repaint */
  repaintSpy: ReturnType<typeof vi.fn>;
  /** spy for setPaused */
  pausedSpy: ReturnType<typeof vi.fn>;
} {
  const repaintSpy = vi.fn(() => {
    // noop, just for spying
  });
  const pausedSpy = vi.fn(() => {
    // noop, just for spying
  });
  return { repaint: repaintSpy, setPaused: pausedSpy, repaintSpy, pausedSpy };
}

/**
 * Build a simple export manager stub whose method returns a deterministic path.
 *
 * @returns Export manager stub and its spy.
 */
function makeExportMgr(): {
  /** Destination directory for exported artifacts. */
  exportsDir: string;
  /** Method under test; returns path of written file. */
  exportCombinedLogs: (
    logs: SlotPaths,
    which: 'error' | 'warn' | 'info' | 'all',
  ) => string;
  /** Spy on exportCombinedLogs. */
  spy: ReturnType<typeof vi.fn>;
} {
  const spy = vi.fn(
    (_logs: SlotPaths, which: 'error' | 'warn' | 'info' | 'all') =>
      `/exp/${which}.log`,
  );
  return { exportsDir: '/exp', exportCombinedLogs: spy, spy };
}

/**
 * Create a Buffer from a one-character string.
 *
 * @param s - A single-character string.
 * @returns A Buffer for the key.
 */
function key(s: string): Buffer {
  return Buffer.from(s, 'utf8');
}

describe('createExtraKeyHandler: viewers', () => {
  const stdout = spyStdout();

  beforeEach(() => {
    stdout.clear();
    mShowCombinedLogs.mockClear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  afterAll(() => {
    stdout.restore();
  });

  it('e / w / i / l trigger showCombinedLogs with correct sources/levels and pause the UI', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy, pausedSpy } = makeUiSpies();

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
    });

    // e => ['err'], 'error'
    handler(key('e'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(logs, ['err'], 'error');
    expect(pausedSpy).toHaveBeenCalledWith(true);

    // While viewing, another key should not stack a new viewer
    const callsAfterE = mShowCombinedLogs.mock.calls.length;
    handler(key('e'));
    expect(mShowCombinedLogs.mock.calls.length).toBe(callsAfterE);

    // Exit viewer with Esc, which resumes UI and repaints
    handler(key('\x1b'));
    expect(pausedSpy).toHaveBeenCalledWith(false);
    expect(repaintSpy).toHaveBeenCalled();

    // w => ['warn','err'], 'warn'
    handler(key('w'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(
      logs,
      ['warn', 'err'],
      'warn',
    );

    // exit before opening another viewer
    handler(key('\x1b'));

    // i => ['info'], 'all'
    handler(key('i'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(logs, ['info'], 'all');

    // exit before opening another viewer
    handler(key('\x1b'));

    // l => ['out','err','structured'], 'all'
    handler(key('l'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(
      logs,
      ['out', 'err', 'structured'],
      'all',
    );
  });

  it('Ctrl+] also exits viewer and repaints', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy, pausedSpy } = makeUiSpies();
    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
    });

    handler(key('e')); // open viewer
    handler(Buffer.from('\x1d', 'utf8')); // Ctrl+]

    expect(pausedSpy).toHaveBeenCalledWith(false);
    expect(repaintSpy).toHaveBeenCalled();
  });

  it('on viewer error, unpauses and repaints (catch path)', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    mShowCombinedLogs.mockRejectedValueOnce(new Error('boom'));

    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy, pausedSpy } = makeUiSpies();
    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
    });

    handler(key('e'));
    // allow microtask queue to process the rejection handler
    await Promise.resolve();

    expect(pausedSpy).toHaveBeenCalledWith(true); // initially paused
    expect(pausedSpy).toHaveBeenCalledWith(false); // unpaused after error
    expect(repaintSpy).toHaveBeenCalled();
  });
});

describe('createExtraKeyHandler: exports', () => {
  const stdout = spyStdout();

  beforeEach(() => {
    stdout.clear();
    mShowCombinedLogs.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  afterAll(() => {
    stdout.restore();
  });

  it('E/W/I/A export combined logs, update exportStatus, and repaint when exportMgr present', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const exportStatus = makeExportStatus();
    const mgr = makeExportMgr();
    const { repaint, setPaused, repaintSpy } = makeUiSpies();

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      exportMgr: mgr,
      exportStatus,
    });

    const seq: Array<[string, 'error' | 'warn' | 'info' | 'all', string]> = [
      ['E', 'error', 'error'],
      ['W', 'warn', 'warn'],
      ['I', 'info', 'info'],
      ['A', 'all', 'ALL'],
    ];

    for (const [k, which] of seq) {
      handler(key(k));
      expect(mgr.spy).toHaveBeenLastCalledWith(logs, which);
      // exportStatus should be populated for the key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cur = (exportStatus as any)[which];
      expect(cur).toMatchObject({ exported: true, path: `/exp/${which}.log` });
      expect(typeof cur.savedAt).toBe('number');
      expect(repaintSpy).toHaveBeenCalled();
    }
  });

  it('uppercase hotkeys are no-ops when exportMgr is absent', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy } = makeUiSpies();

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
    });

    handler(key('E'));
    handler(key('W'));
    handler(key('I'));
    handler(key('A'));

    expect(repaintSpy).not.toHaveBeenCalled();
    expect(mShowCombinedLogs).not.toHaveBeenCalled();
    // No stdout messages about exports
    expect(stdout.calls().join('')).not.toMatch(/Wrote combined/);
  });
});

describe('createExtraKeyHandler: custom keys', () => {
  const stdout = spyStdout();

  beforeEach(() => {
    stdout.clear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  afterAll(() => {
    stdout.restore();
  });

  it('invokes custom handler with say and noteExport helpers', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const exportStatus = makeExportStatus();
    const { repaint, setPaused, repaintSpy } = makeUiSpies();

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      exportStatus,
      custom: {
        F: ({ say, noteExport }): void => {
          say('Hello from custom');
          noteExport('info' as keyof ExportStatusMap, '/tmp/f.csv');
        },
      },
    });

    handler(key('F'));

    // Assert the side effects rather than fragile stdout text.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { info } = exportStatus as any;
    expect(info).toMatchObject({ path: '/tmp/f.csv', exported: true });
    expect(typeof info.savedAt).toBe('number');
    expect(repaintSpy).toHaveBeenCalled();
  });
});
/* eslint-enable max-lines */
