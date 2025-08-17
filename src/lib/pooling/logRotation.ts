// logRotation.ts
import { readdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import colors from 'colors';

/**
 * Reset worker logs in the given directory.
 * mode:
 *  - "truncate": empty files but keep them (best if tails are open)
 *  - "delete": remove files entirely (simplest if no tails yet)
 *
 * @param dir - Directory to reset logs in
 * @param mode - 'truncate' or 'delete'
 */
export function resetWorkerLogs(
  dir: string,
  mode: 'truncate' | 'delete',
): void {
  const patterns = [
    /worker-\d+\.log$/,
    /worker-\d+\.out\.log$/,
    /worker-\d+\.err\.log$/,
    /worker-\d+\.warn\.log$/,
    /worker-\d+\.info\.log$/,
  ];
  for (const name of readdirSync(dir)) {
    // eslint-disable-next-line no-continue
    if (!patterns.some((rx) => rx.test(name))) continue;
    const p = join(dir, name);
    try {
      if (mode === 'delete' && existsSync(p)) unlinkSync(p);
      else writeFileSync(p, '');
    } catch {
      /* ignore */
    }
  }
  process.stdout.write(
    colors.dim(
      `Logs have been ${
        mode === 'delete' ? 'deleted' : 'truncated'
      } in ${dir}\n`,
    ),
  );
}

/**
 * Very robust classification of a single log line into warn/error.
 * Returns 'warn' | 'error' | null (null = not a level we care to badge).
 *
 * @param line - Single line of log output to classify
 * @returns 'warn' | 'error' | null
 */
export function classifyLogLevel(line: string): 'warn' | 'error' | null {
  // Strip common ANSI sequences
  // eslint-disable-next-line no-control-regex
  const s = line.replace(/\x1B\[[0-9;]*m/g, '');

  // 1) Explicit worker tag: "[w12] WARN ..." or "[w2] ERROR ..."
  const mTag = /\[w\d+\]\s+(ERROR|WARN)\b/i.exec(s);
  if (mTag) return mTag[1].toLowerCase() as 'warn' | 'error';

  // 2) Common plain prefixes
  if (/^\s*(ERROR|ERR|FATAL)\b/i.test(s)) return 'error';
  if (/^\s*(WARN|WARNING)\b/.test(s)) return 'warn';

  // Node runtime warnings
  if (/^\s*\(node:\d+\)\s*Warning:/i.test(s)) return 'warn';
  if (/^\s*DeprecationWarning:/i.test(s)) return 'warn';

  // 3) JSON logs (pino/bunyan/etc.)
  // Try to parse as JSON and inspect `level`
  try {
    const j = JSON.parse(s);
    const lv = j?.level;
    if (typeof lv === 'number') {
      // pino levels: 40=warn, 50=error, 60=fatal
      if (lv >= 50) return 'error';
      if (lv >= 40) return 'warn';
    } else if (typeof lv === 'string') {
      const L = lv.toLowerCase();
      if (L === 'error' || L === 'fatal') return 'error';
      if (L === 'warn' || L === 'warning') return 'warn';
    }
  } catch {
    // not JSON, ignore
  }

  // 4) Fallthrough: look for level words inside worker-tagged lines
  // e.g. "[w3] something WARNING xyz"
  const mInline = /\[w\d+\].*\b(WARN|WARNING|ERROR|FATAL)\b/i.exec(s);
  if (mInline) {
    const L = mInline[1].toUpperCase();
    return L === 'ERROR' || L === 'FATAL' ? 'error' : 'warn';
  }

  return null;
}

/**
 * Stream splitter to get whole lines from 'data' events
 *
 * @param onLine - Callback to call with each complete line
 * @returns A function that processes a chunk of data and calls onLine for each complete line
 */
export function makeLineSplitter(
  onLine: (line: string) => void,
): (chunk: Buffer | string) => void {
  let buf = '';
  return (chunk: Buffer | string) => {
    buf += chunk.toString('utf8');
    let nl: number;
    // eslint-disable-next-line no-cond-assign
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl);
      onLine(line);
      buf = buf.slice(nl + 1);
    }
  };
}
