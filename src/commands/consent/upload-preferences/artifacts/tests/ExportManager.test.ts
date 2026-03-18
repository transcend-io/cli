import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Imports (safe after mocks are set up) ---
import { mkdirSync, writeFileSync } from 'node:fs';
import { artifactAbsPath } from '../artifactAbsPath';
import {
  copyToClipboard,
  openPath,
  revealInFileManager,
} from '../../../../../lib/pooling';
import { ExportManager } from '../ExportManager';

// --- Hoisted shared state for mocks ---
const H = vi.hoisted(() => {
  const state = {
    files: {} as Record<string, string>,
    extractBlocksQueue: [] as string[][],
    fns: {
      copyToClipboard: vi.fn(() => true),
      openPath: vi.fn(() => true),
      revealInFileManager: vi.fn(() => true),
      extractBlocks: vi.fn(() => {
        const next = state.extractBlocksQueue.shift();
        return next ?? [];
      }),
      readSafe: vi.fn((p?: string) => (p ? state.files[p] ?? '' : '')),
    },
  };
  return state;
});

// --- Mocks ---
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('../artifactAbsPath', () => ({
  artifactAbsPath: vi.fn(
    (kind: string, dir?: string, status?: { path?: string }) =>
      `[abs:${kind}:${dir ?? ''}:${status?.path ?? ''}]`,
  ),
}));

vi.mock('../../../../../lib/pooling', () => ({
  copyToClipboard: H.fns.copyToClipboard,
  openPath: H.fns.openPath,
  revealInFileManager: H.fns.revealInFileManager,
  extractBlocks: H.fns.extractBlocks,
  isLogError: vi.fn(() => false),
  isLogWarn: vi.fn(() => false),
}));

vi.mock('../../../../../lib/helpers', () => ({
  readSafe: H.fns.readSafe,
}));

// --- Test Suite ---
describe('ExportManager', () => {
  const mMkdir = vi.mocked(mkdirSync);
  const mWrite = vi.mocked(writeFileSync);
  const mAbs = vi.mocked(artifactAbsPath);
  const mCopy = vi.mocked(copyToClipboard);
  const mOpen = vi.mocked(openPath);
  const mReveal = vi.mocked(revealInFileManager);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T03:04:05.678Z'));
    H.files = {};
    H.extractBlocksQueue = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function lastWrittenText(): string {
    const { calls } = mWrite.mock;
    const last = calls[calls.length - 1];
    return String(last?.[1] ?? '');
  }

  it('artifactPath delegates correctly', () => {
    const mgr = new ExportManager('/exports/dir');
    const st = {
      error: { path: '/custom/err.log' },
      warn: { path: '/custom/warn.log' },
      info: { path: '/custom/info.log' },
      all: { path: '/custom/all.log' },
      failuresCsv: { path: '/custom/f.csv' },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(mgr.artifactPath('error', st as any)).toContain('/custom/err.log');
    expect(mAbs).toHaveBeenCalled();
  });

  it('open/reveal/copy return expected objects', async () => {
    const mgr = new ExportManager('/exports/dir');
    mAbs.mockImplementation((k: string, d?: string) => `[abs:${k}:${d}]`);

    mOpen.mockResolvedValueOnce(true);
    await expect(mgr.open('info')).resolves.toEqual({
      ok: true,
      path: '[abs:info:/exports/dir]',
    });

    mReveal.mockResolvedValueOnce(false);
    await expect(mgr.reveal('error')).resolves.toEqual({
      ok: false,
      path: '[abs:error:/exports/dir]',
    });

    mCopy.mockResolvedValueOnce(true);
    await expect(mgr.copy('failures-csv')).resolves.toEqual({
      ok: true,
      path: '[abs:failures-csv:/exports/dir]',
    });
  });

  it('exportCombinedLogs(all) concatenates logs in order', () => {
    const mgr = new ExportManager('/exports');
    H.files['/o1'] = '2024-01-01T00:00:02Z OUT1';
    H.files['/e1'] = '2024-01-01T00:00:01Z ERR1';
    H.files['/s1'] = '2024-01-01T00:00:03Z STR1';
    H.files['/o2'] = '2024-01-01T00:00:00Z OUT2';
    const map = new Map([
      [2, { outPath: '/o2' }],
      [1, { outPath: '/o1', errPath: '/e1', structuredPath: '/s1' }],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outPath = mgr.exportCombinedLogs(map as any, 'all');
    expect(mMkdir).toHaveBeenCalled();
    expect(outPath).toMatch(/combined-all/);
    expect(lastWrittenText()).toContain('OUT2');
  });
});
