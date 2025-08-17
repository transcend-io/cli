import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { ExportStatusMap, SlotPaths } from '../../../../../lib/pooling';
import {
  makeOnKeypressExtra,
  type MakeOnKeypressExtraArgs,
} from '../makeOnKeypressExtra';

import { showCombinedLogs } from '../../../../../lib/pooling';
import {
  writeFailingUpdatesCsv,
  type ExportManager,
  type FailingUpdateRow,
} from '../../artifacts';

// ---- Mocks (must be defined before SUT side-effects are exercised) ----
vi.mock('../../../../../lib/pooling', () => ({
  showCombinedLogs: vi.fn(),
}));
vi.mock('../../artifacts', () => ({
  writeFailingUpdatesCsv: vi.fn(),
}));

// ---- Fixtures & helpers ------------------------------------------------

/**
 * Create a minimal fake ExportManager with a controllable implementation.
 *
 * @param impl - Optional per-level return values or error
 * @returns A fake ExportManager
 */
function makeFakeExportManager(impl?: {
  /** When set, exportCombinedLogs will throw for this level */
  throwForLevel?: 'error' | 'warn' | 'info' | 'all';
  /** Optional explicit return path per level */
  paths?: Partial<Record<'error' | 'warn' | 'info' | 'all', string>>;
}): ExportManager {
  const em = {
    exportsDir: '/exp',
    exportCombinedLogs: (
      _: SlotPaths,
      level: 'error' | 'warn' | 'info' | 'all',
    ): string => {
      if (impl?.throwForLevel === level) throw new Error(`boom:${level}`);
      return impl?.paths?.[level] ?? `/exp/combined-${level}.log`;
    },
  };
  return em as ExportManager;
}

/**
 * Build a default set of args for makeOnKeypressExtra.
 *
 * @returns Tuple of [args, spies, handler, exportStatus]
 */
function buildArgs(): {
  args: Parameters<typeof makeOnKeypressExtra>[0];
  onPauseSpy: ReturnType<typeof vi.fn<(p: boolean) => void>>;
  onRepaintSpy: ReturnType<typeof vi.fn<() => void>>;
  handler: (buf: Buffer) => void;
  exportStatus: ExportStatusMap;
} {
  const onPauseSpy = vi.fn<(p: boolean) => void>();
  const onRepaintSpy = vi.fn<() => void>();

  const exportStatus: ExportStatusMap = {
    error: undefined,
    warn: undefined,
    info: undefined,
    all: undefined,
    failuresCsv: undefined,
  };

  const args: MakeOnKeypressExtraArgs = {
    slotLogPaths: new Map() as unknown as SlotPaths,
    exportMgr: makeFakeExportManager(),
    failingUpdates: [
      { id: 'abc', reason: 'nope' },
    ] as unknown as Array<FailingUpdateRow>,
    exportStatus,
    onRepaint: onRepaintSpy,
    onPause: onPauseSpy,
  };

  const handler = makeOnKeypressExtra(args);

  return { args, onPauseSpy, onRepaintSpy, handler, exportStatus };
}

describe('makeOnKeypressExtra', () => {
  const mShow = vi.mocked(showCombinedLogs);
  const mWriteFailCsv = vi.mocked(writeFailingUpdatesCsv);

  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Silence & capture stdout writes for assertions
    writeSpy = vi
      .spyOn(process.stdout, 'write')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => true as unknown as boolean) as any;
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('returns a keypress handler function', () => {
    const { handler } = buildArgs();
    expect(typeof handler).toBe('function');
    // Explicit runtime check that it accepts a Buffer and returns void
    const out: void = handler(Buffer.from('x'));
    expect(out).toBeUndefined();
  });

  it('viewer keys call showCombinedLogs and pause the UI', () => {
    const { handler, onPauseSpy } = buildArgs();

    handler(Buffer.from('e')); // errors only
    expect(mShow).toHaveBeenCalledWith(expect.anything(), ['err'], 'error');
    expect(onPauseSpy).toHaveBeenLastCalledWith(true);

    handler(Buffer.from('w')); // warn + err
    expect(mShow).toHaveBeenCalledWith(
      expect.anything(),
      ['warn', 'err'],
      'warn',
    );

    handler(Buffer.from('i')); // info
    expect(mShow).toHaveBeenCalledWith(expect.anything(), ['info'], 'all');

    handler(Buffer.from('l')); // all logs
    expect(mShow).toHaveBeenCalledWith(
      expect.anything(),
      ['out', 'err', 'structured'],
      'all',
    );
  });

  it('export keys write combined logs, update exportStatus, and repaint', () => {
    const { handler, exportStatus, onRepaintSpy } = buildArgs();

    handler(Buffer.from('E'));
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Wrote combined error logs to: /exp/combined-error.log',
      ),
    );
    expect(exportStatus.error?.path).toBe('/exp/combined-error.log');
    expect(exportStatus.error?.exported).toBe(true);
    expect(typeof exportStatus.error?.savedAt).toBe('number');
    expect(onRepaintSpy).toHaveBeenCalled();

    handler(Buffer.from('W'));
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Wrote combined warn logs to: /exp/combined-warn.log',
      ),
    );
    expect(exportStatus.warn?.path).toBe('/exp/combined-warn.log');

    handler(Buffer.from('I'));
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Wrote combined info logs to: /exp/combined-info.log',
      ),
    );
    expect(exportStatus.info?.path).toBe('/exp/combined-info.log');

    handler(Buffer.from('A'));
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Wrote combined ALL logs to: /exp/combined-all.log',
      ),
    );
    expect(exportStatus.all?.path).toBe('/exp/combined-all.log');
  });

  it('handles export errors gracefully (writes failure message)', () => {
    const { args, exportStatus } = buildArgs();
    // Rebuild handler with a manager that throws on "warn"
    const throwing = makeFakeExportManager({ throwForLevel: 'warn' });
    const handler = makeOnKeypressExtra({ ...args, exportMgr: throwing });

    handler(Buffer.from('W'));
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write combined warn logs'),
    );
    // Should not set exportStatus.warn on failure
    expect(exportStatus.warn).toBeUndefined();
  });

  it('writes failing updates CSV on "F" and records the path', () => {
    const { handler, exportStatus, onRepaintSpy } = buildArgs();

    handler(Buffer.from('F'));
    expect(mWriteFailCsv).toHaveBeenCalledTimes(1);
    expect(mWriteFailCsv.mock.calls[0]?.[1]).toBe('/exp/failing-updates.csv');

    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Wrote failing updates CSV to: /exp/failing-updates.csv',
      ),
    );
    expect(exportStatus.failuresCsv?.path).toBe('/exp/failing-updates.csv');
    expect(exportStatus.failuresCsv?.exported).toBe(true);
    expect(onRepaintSpy).toHaveBeenCalled();
  });

  it('handles failing updates CSV error path', () => {
    const { args } = buildArgs();
    mWriteFailCsv.mockImplementationOnce(() => {
      throw Object.assign(new Error('nope'), { stack: 'STACK!' });
    });
    const handler = makeOnKeypressExtra(args);

    handler(Buffer.from('F'));
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write failing updates CSV'),
    );
    // includes stack
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('STACK!'));
  });

  it('escape or ^] resumes (unpauses) and repaints', () => {
    const { handler, onPauseSpy, onRepaintSpy } = buildArgs();
    handler(Buffer.from('\x1b')); // ESC
    expect(onPauseSpy).toHaveBeenCalledWith(false);
    expect(onRepaintSpy).toHaveBeenCalled();

    onPauseSpy.mockClear();
    onRepaintSpy.mockClear();

    handler(Buffer.from('\x1d')); // ^] (GS)
    expect(onPauseSpy).toHaveBeenCalledWith(false);
    expect(onRepaintSpy).toHaveBeenCalled();
  });

  it('unknown keys perform no actions', () => {
    const { handler } = buildArgs();

    handler(Buffer.from('z'));
    expect(showCombinedLogs).not.toHaveBeenCalled();
    expect(writeFailingUpdatesCsv).not.toHaveBeenCalled();
    // No success/failure strings written
    const allWrites = writeSpy.mock.calls.map((c) => String(c[0]));
    const meaningful = allWrites.filter((s) => /Wrote|Failed/.test(s));
    expect(meaningful.length).toBe(0);
  });
});
