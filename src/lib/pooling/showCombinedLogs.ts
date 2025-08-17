/* eslint-disable no-continue, no-control-regex */
import { readFileSync } from 'node:fs';
import type { WorkerLogPaths } from './spawnWorkerProcess';

/**
 * Log locations
 */
export type LogLocation = 'out' | 'err' | 'structured' | 'warn' | 'info';

/**
 * Which logs to show in the combined output.
 * Can include 'out' (stdout), 'err' (stderr), 'structured' (
 */
export type WhichLogs = Array<LogLocation>;

/**
 * Show combined logs from all worker processes.
 *
 * @param slotLogPaths - Map of worker IDs to their log file paths.
 * @param whichList - one or more sources to include (e.g., ['err','out'])
 * @param filterLevel - 'error', 'warn', or 'all' to filter log levels.
 */
export function showCombinedLogs(
  slotLogPaths: Map<number, WorkerLogPaths | undefined>,
  whichList: WhichLogs,
  filterLevel: 'error' | 'warn' | 'all',
): void {
  process.stdout.write('\x1b[2J\x1b[H');

  const isError = (t: string): boolean =>
    /\b(ERROR|uncaughtException|unhandledRejection)\b/i.test(t);
  const isWarnTag = (t: string): boolean => /\b(WARN|WARNING)\b/i.test(t);

  const lines: string[] = [];

  for (const [, paths] of slotLogPaths) {
    if (!paths) continue;

    const files: Array<{
      /** Absolute file path to read from */
      path: string;
      /**   Source type for this file, used for classification */
      src: LogLocation;
    }> = [];
    for (const which of whichList) {
      if (which === 'out' && paths.outPath) {
        files.push({ path: paths.outPath, src: 'out' });
      }
      if (which === 'err' && paths.errPath) {
        files.push({ path: paths.errPath, src: 'err' });
      }
      if (which === 'structured' && paths.structuredPath) {
        files.push({ path: paths.structuredPath, src: 'structured' });
      }
      if (paths.warnPath && which === 'warn') {
        files.push({ path: paths.warnPath, src: 'warn' });
      }
      if (paths.infoPath && which === 'info') {
        files.push({ path: paths.infoPath, src: 'info' });
      }
    }

    for (const { path, src } of files) {
      let text = '';
      try {
        text = readFileSync(path, 'utf8');
      } catch {
        continue;
      }

      for (const ln of text.split('\n')) {
        if (!ln) continue;

        const clean = ln.replace(/\x1B\[[0-9;]*m/g, '');

        if (filterLevel === 'all') {
          lines.push(ln);
          continue;
        }

        if (filterLevel === 'error') {
          if (isError(clean)) lines.push(ln);
          continue;
        }

        // filterLevel === 'warn'
        // Accept:
        //  - explicit WARN tag anywhere
        //  - OR lines from stderr that are NOT explicit errors (many warn libs print to stderr)
        //  - OR lines containing the word "warning" (common in some libs)
        if (isWarnTag(clean) || (src === 'err' && !isError(clean))) {
          lines.push(ln);
          continue;
        }
      }
    }
  }

  // simple time-sort; each worker often prefixes ISO timestamps
  lines.sort((a, b) => {
    const ta = a.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0] ?? '';
    const tb = b.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0] ?? '';
    return ta.localeCompare(tb);
  });

  process.stdout.write(`${lines.join('\n')}\n`);
  process.stdout.write('\nPress Esc/Ctrl+] to return to dashboard.\n');
}
/* eslint-enable no-continue, no-control-regex */
