import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { readFileSync } from 'node:fs';
import { showCombinedLogs, type WhichLogs } from '../showCombinedLogs';
import type { WorkerLogPaths } from '../spawnWorkerProcess';

/**
 * Mock fs BEFORE importing the SUT.
 * Inline factory avoids Vitest hoisting pitfalls.
 */
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

const mockedRead = vi.mocked(readFileSync);

describe('showCombinedLogs', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let writes: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    // Capture writes to stdout in-memory
    writes = [];
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  /**
   * Install a fake filesystem for readFileSync.
   *
   * @param files - Map from path to file content. Missing paths will throw.
   */
  function installFs(files: Record<string, string>): void {
    mockedRead.mockImplementation((pRaw, encoding) => {
      const p = String(pRaw);
      if (encoding && encoding !== 'utf8') {
        throw new Error(`Unsupported encoding in test: ${encoding}`);
      }
      const s = files[p];
      if (s === undefined) {
        const e = new Error('ENOENT');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).code = 'ENOENT';
        throw e;
      }
      return s;
    });
  }

  /**
   * Build a WorkerLogPaths object with only the fields we care about for this test.
   *
   * @param partial - Partial WorkerLogPaths fields to include
   * @returns a typed WorkerLogPaths object
   */
  function paths(partial: Partial<WorkerLogPaths>): WorkerLogPaths {
    return {
      outPath: undefined,
      errPath: undefined,
      structuredPath: undefined,
      infoPath: undefined,
      warnPath: undefined,
      ...partial,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Create a slot map with provided entries.
   *
   * @param entries - Array of [id, WorkerLogPaths] to insert into the map.
   * @returns slot map suitable for SUT
   */
  function slotMap(
    entries: Array<[number, WorkerLogPaths | undefined]>,
  ): Map<number, WorkerLogPaths | undefined> {
    return new Map<number, WorkerLogPaths | undefined>(entries);
  }

  it('prints all selected logs time-sorted when filterLevel="all"', () => {
    installFs({
      '/w1.err': '2025-01-01T00:00:01 WARN first-warn\n',
      '/w1.out': '2025-01-01T00:00:02 info second-info\n',
      // stray blank lines are ignored by SUT anyway
    });

    const slots = slotMap([
      [1, paths({ errPath: '/w1.err', outPath: '/w1.out' })],
    ]);

    const which: WhichLogs = ['err', 'out'];
    showCombinedLogs(slots, which, 'all');

    // first write: clear screen escape
    expect(writes[0]).toBe('\x1b[2J\x1b[H');

    // second write: time-sorted combined lines + trailing \n
    expect(writes[1]).toBe(
      '2025-01-01T00:00:01 WARN first-warn\n' +
        '2025-01-01T00:00:02 info second-info\n',
    );

    // third write: prompt line
    expect(writes[2]).toBe('\nPress Esc/Ctrl+] to return to dashboard.\n');
    expect(writes).toHaveLength(3);
  });

  it('filters only error lines when filterLevel="error" (ANSI stripped for classification, original preserved)', () => {
    installFs({
      '/w1.err':
        '2025-01-02T10:10:10 \x1b[31mERROR\x1b[0m boom\n' + // should match via cleaned text; output keeps ANSI
        '2025-01-02T10:10:11 WARN should-not-appear\n',
      '/w1.out': '2025-01-02T10:10:12 info ignore\n',
    });

    const slots = slotMap([
      [1, paths({ errPath: '/w1.err', outPath: '/w1.out' })],
    ]);

    const which: WhichLogs = ['err', 'out'];
    showCombinedLogs(slots, which, 'error');

    // second write has only the ANSI-containing ERROR line
    const combined = writes[1];
    expect(combined).toContain('\x1b[31mERROR\x1b[0m boom');
    expect(combined).not.toContain('WARN should-not-appear');
    expect(combined).not.toContain('info ignore');
  });

  it('filters warn lines: explicit WARN|WARNING or stderr non-error lines', () => {
    installFs({
      '/w1.err':
        '2025-01-03T12:00:00 just-stderr-line\n' + // src=err, not error → included
        '2025-01-03T12:00:01 ERROR bad\n', // error → excluded for warn filter
      '/w1.out':
        '2025-01-03T12:00:02 WARNING loud\n' + // explicit WARNING → included
        '2025-01-03T12:00:03 info ignore\n', // out, no warn tag → excluded
    });

    const slots = slotMap([
      [1, paths({ errPath: '/w1.err', outPath: '/w1.out' })],
    ]);

    const which: WhichLogs = ['err', 'out'];
    showCombinedLogs(slots, which, 'warn');

    const combined = writes[1];
    expect(combined).toContain('just-stderr-line');
    expect(combined).toContain('WARNING loud');
    expect(combined).not.toContain('ERROR bad');
    expect(combined).not.toContain('info ignore');
  });

  it('skips missing files (read errors) and still prints prompt', () => {
    installFs({
      '/exists.out': '2025-01-04T01:00:00 hello\n',
      // '/missing.err' is absent → read throws
    });

    const slots = slotMap([
      [1, paths({ outPath: '/exists.out', errPath: '/missing.err' })],
    ]);

    const which: WhichLogs = ['err', 'out'];
    showCombinedLogs(slots, which, 'all');

    // Check we still printed the out content and the prompt
    expect(writes[1]).toBe('2025-01-04T01:00:00 hello\n');
    expect(writes[2]).toBe('\nPress Esc/Ctrl+] to return to dashboard.\n');
  });

  it('when nothing is emitted (no files / all missing), still prints blank line and prompt', () => {
    installFs({});

    const slots = slotMap([
      [1, undefined],
      [2, paths({ errPath: '/nope.err' })], // missing → read throws
    ]);

    const which: WhichLogs = ['err', 'out', 'structured', 'warn', 'info'];
    showCombinedLogs(slots, which, 'all');

    // `${lines.join('\n')}\n` with empty lines is just "\n"
    expect(writes[1]).toBe('\n');
    expect(writes[2]).toBe('\nPress Esc/Ctrl+] to return to dashboard.\n');
  });

  it('respects whichList selection of sources', () => {
    installFs({
      '/only.out': '2025-01-05T00:00:00 OUT-LINE\n',
      '/only.err': '2025-01-05T00:00:01 ERR-LINE\n',
      '/only.info': '2025-01-05T00:00:02 INFO-LINE\n',
    });

    const slots = slotMap([
      [
        1,
        paths({
          outPath: '/only.out',
          errPath: '/only.err',
          infoPath: '/only.info',
        }),
      ],
    ]);

    // Only include 'info' — exclude 'out' and 'err'
    showCombinedLogs(slots, ['info'], 'all');

    const combined = writes[1];
    expect(combined).toContain('INFO-LINE');
    expect(combined).not.toContain('OUT-LINE');
    expect(combined).not.toContain('ERR-LINE');
  });
});
