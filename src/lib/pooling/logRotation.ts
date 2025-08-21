// logRotation.ts
import {
  readdirSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs';
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
function resetWorkerLogs(dir: string, mode: 'truncate' | 'delete'): void {
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
/**
 * Checks if a log line contains an error indicator.
 *
 * @param t - The log line to check
 * @returns True if the line contains an error keyword, false otherwise
 */
export function isLogError(t: string): boolean {
  return /\b(ERROR|uncaughtException|unhandledRejection)\b/i.test(t);
}

/**
 * Checks if a log line contains a warning indicator.
 *
 * @param t - The log line to check
 * @returns True if the line contains a warning keyword, false otherwise
 */
export function isLogWarn(t: string): boolean {
  return /\b(WARN|WARNING)\b/i.test(t);
}

/**
 * Determines if a log line is a new header (error, warning, worker tag, or ISO timestamp).
 *
 * @param t - The log line to check
 * @returns True if the line is a new header, false otherwise
 */
export function isLogNewHeader(t: string): boolean {
  return (
    isLogError(t) ||
    isLogWarn(t) ||
    /^\s*\[w\d+\]/.test(t) ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(t)
  );
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string): string => s.replace(/\x1B\[[0-9;]*m/g, '');

/**
 * Extracts blocks of text from a larger body of text.
 *
 * @param text - The text to extract blocks from
 * @param starts - A function that determines if a line starts a new block
 * @returns An array of extracted blocks
 */
export function extractBlocks(
  text: string,
  starts: (cleanLine: string) => boolean,
): string[] {
  if (!text) return [];
  const out: string[] = [];
  const lines = text.split('\n');
  let buf: string[] = [];
  let inBlock = false;

  const flush = (): void => {
    if (buf.length) out.push(buf.join('\n'));
    buf = [];
    inBlock = false;
  };

  for (const raw of lines) {
    const clean = stripAnsi(raw || '');
    const headery = isLogNewHeader(clean);
    if (!inBlock) {
      if (starts(clean)) {
        inBlock = true;
        buf.push(raw);
      }
      // eslint-disable-next-line no-continue
      continue;
    }
    if (!raw || headery) {
      flush();
      if (starts(clean)) {
        inBlock = true;
        buf.push(raw);
      }
    } else {
      buf.push(raw);
    }
  }
  flush();
  return out.filter(Boolean);
}

/**
 * The kind of export artifact to retrieve the path for.
 */
export type LogExportKind = 'error' | 'warn' | 'info' | 'all';

/**
 * Ensure log directory exists
 *
 * @param rootDir - Root directory
 * @returns log dir
 */
export function initLogDir(rootDir: string): string {
  const logDir = join(rootDir, 'logs');
  mkdirSync(logDir, { recursive: true });

  const RESET_MODE =
    (process.env.RESET_LOGS as 'truncate' | 'delete') ?? 'truncate';
  resetWorkerLogs(logDir, RESET_MODE);

  return logDir;
}

export interface ExportArtifactResult {
  /** Whether the artifact was opened successfully */
  ok?: boolean;
  /** The absolute path to the export artifact */
  path: string;
  /** Time saved */
  savedAt?: number;
  /** If exported */
  exported?: boolean;
}

/**
 * Status map for export artifacts.
 */
export type ExportStatusMap = {
  /** The absolute paths to the error log artifacts */
  error?: ExportArtifactResult;
  /** The absolute paths to the warn log artifacts */
  warn?: ExportArtifactResult;
  /** The absolute paths to the info log artifacts */
  info?: ExportArtifactResult;
  /** The absolute paths to all log artifacts */
  all?: ExportArtifactResult;
  /** The absolute paths to the failures CSV artifacts */
  failuresCsv?: ExportArtifactResult;
};

/**
 * Return export statuses
 *
 * @param receiptsFolder - Receipts directory
 * @returns Export map
 */
export function buildExportStatus(receiptsFolder: string): ExportStatusMap {
  return {
    error: { path: join(receiptsFolder, 'combined-errors.log') },
    warn: { path: join(receiptsFolder, 'combined-warns.log') },
    info: { path: join(receiptsFolder, 'combined-info.log') },
    all: { path: join(receiptsFolder, 'combined-all.log') },
    failuresCsv: { path: join(receiptsFolder, 'failing-updates.csv') },
  };
}
