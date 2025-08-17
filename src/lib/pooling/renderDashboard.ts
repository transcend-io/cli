// renderDashboard.ts
import { basename, join } from 'node:path';
import colors from 'colors';
import * as readline from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import type { WorkerState } from './assignWorkToWorker';
import type { getWorkerLogPaths } from './spawnWorkerProcess';

/** Upload-mode totals (final-ish counters derived from receipts) */
export type UploadModeTotals = {
  /** */
  mode: 'upload';
  /** */
  success: number;
  /** */
  skipped: number;
  /** */
  error: number;
  /** */
  errors: Record<string, number>;
};

/** Check-mode totals (dry-run counters) */
export type CheckModeTotals = {
  /** */
  mode: 'check';
  /** */
  pendingConflicts: number;
  /** */
  pendingSafe: number;
  /** */
  totalPending: number;
  /** */
  skipped: number;
};

/** Total type for both upload and check modes. */
export type AnyTotals = UploadModeTotals | CheckModeTotals;

/** Export kinds we support in the UI */
export type LogExportKind = 'error' | 'warn' | 'info' | 'all';

/** Status for a single export artifact */
export interface ExportArtifactStatus {
  /** Absolute path of the last written artifact file */
  path: string;
  /** Unix ms when that file was last written */
  savedAt?: number;
  /** True once we’ve exported at least once during this parent run */
  exported?: boolean;
}

/** Map of all export artifacts we show */
export interface ExportStatusMap {
  /** */
  error?: ExportArtifactStatus;
  /** */
  warn?: ExportArtifactStatus;
  /** */
  info?: ExportArtifactStatus;
  /** */
  all?: ExportArtifactStatus;
  /** */
  failuresCsv?: ExportArtifactStatus; // for Shift+F CSV of failing updates
}

/** Render options for the dashboard */
export interface RenderDashboardInput {
  /** Number of live workers in the pool */
  poolSize: number;
  /** CPU count hint shown to user */
  cpuCount: number;

  /** Total files discovered at start */
  filesTotal: number;
  /** Completed files count */
  filesCompleted: number;
  /** Failed files count */
  filesFailed: number;

  /** Live map of worker state (includes per-worker progress) */
  workerState: Map<number, WorkerState>;

  /** Mode-specific aggregates to print under the title */
  totals?: AnyTotals;

  /** Final frame? If true, show the cursor and freeze the output */
  final?: boolean;

  /** Live throughput numbers (records/sec) */
  throughput?: {
    /** */
    successSoFar: number;
    /** */
    r10s: number;
    /** */
    r60s: number;
  };

  /**
   * Directory where export artifacts (combined logs / CSV) are written.
   * Always shown so users know where to find files.
   */
  exportsDir?: string;

  /**
   * Current (latest) artifact status per kind. When a kind has never been
   * exported this session, the line renders in dim text and shows a sensible
   * default path in exportsDir so users know where it will appear.
   */
  exportStatus?: ExportStatusMap;
}

let lastFrame = '';

/* ------------------------------------------------------------
 * Small helpers
 * ------------------------------------------------------------ */

const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, '');
const isError = (t: string) =>
  /\b(ERROR|uncaughtException|unhandledRejection)\b/i.test(t);
const isWarn = (t: string) => /\b(WARN|WARNING)\b/i.test(t);

/**
 * Consider a line a “header” if it looks like the start of a new log record.
 * Helps us group multi-line WARN/ERROR blocks.
 *
 * @param t
 */
const isNewHeader = (t: string) =>
  isError(t) ||
  isWarn(t) ||
  /^\s*\[w\d+\]/.test(t) ||
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(t);

/**
 * Given raw text of a log file, return only the multi-line "blocks"
 * whose first line satisfies `starts` (e.g., isWarn/isError). Blocks
 * continue until the next header-like line or a blank line.
 *
 * @param text
 * @param starts
 */
function extractBlocks(
  text: string,
  starts: (cleanLine: string) => boolean,
): string[] {
  if (!text) return [];
  const out: string[] = [];
  const lines = text.split('\n');

  let buf: string[] = [];
  let inBlock = false;

  const flush = () => {
    if (buf.length) out.push(buf.join('\n'));
    buf = [];
    inBlock = false;
  };

  for (const raw of lines) {
    const clean = stripAnsi(raw || '');
    const headery = isNewHeader(clean);

    if (!inBlock) {
      if (starts(clean)) {
        inBlock = true;
        buf.push(raw);
      }
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

const fmtNum = (n: number): string => n.toLocaleString();
const fmtTime = (ts?: number): string =>
  ts ? new Date(ts).toLocaleTimeString() : '—';

/* ------------------------------------------------------------
 * Main renderer
 * ------------------------------------------------------------ */

/**
 * Render the multi-worker upload dashboard.
 *
 * Always shows:
 *  - Exports directory
 *  - One line per export hotkey with the target file path,
 *    last saved time, and green coloring after first success
 *
 * @param root0
 */
export function renderDashboard({
  poolSize,
  cpuCount,
  filesTotal,
  filesCompleted,
  filesFailed,
  workerState,
  totals,
  final,
  throughput,
  exportsDir,
  exportStatus = {},
}: RenderDashboardInput): void {
  const redIf = (n: number, s: string): string => (n > 0 ? colors.red(s) : s);

  const inProgress = [...workerState.values()].filter((s) => s.busy).length;

  // Global file-level progress (files)
  const completedFiles = filesCompleted + filesFailed;
  const pct =
    filesTotal === 0
      ? 100
      : Math.floor((completedFiles / Math.max(1, filesTotal)) * 100);
  const barWidth = 40;
  const filled = Math.floor((pct / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  // Estimate TOTAL JOBS (records)
  const jobsFromReceipts =
    totals && totals.mode === 'upload'
      ? (totals.success || 0) + (totals.skipped || 0) + (totals.error || 0)
      : undefined;

  const inflightJobsKnown = [...workerState.values()].reduce((sum, s) => {
    const t = s.progress?.total ?? 0;
    return sum + (t > 0 && s.busy ? t : 0);
  }, 0);

  const avgJobsPerCompletedFile =
    jobsFromReceipts !== undefined && completedFiles > 0
      ? jobsFromReceipts / completedFiles
      : undefined;

  const remainingFiles = Math.max(filesTotal - completedFiles - inProgress, 0);

  let estTotalJobsText = colors.dim('Est. total jobs: —');
  if (avgJobsPerCompletedFile !== undefined) {
    const est =
      (jobsFromReceipts ?? 0) +
      inflightJobsKnown +
      remainingFiles * avgJobsPerCompletedFile;
    estTotalJobsText = colors.dim(
      `Est. total jobs: ${fmtNum(Math.round(est))}`,
    );
  } else if (inProgress > 0) {
    const avgInFlight =
      inflightJobsKnown > 0 ? inflightJobsKnown / inProgress : 0;
    if (avgInFlight > 0) {
      const est = inflightJobsKnown + remainingFiles * avgInFlight;
      estTotalJobsText = colors.dim(
        `Est. total jobs: ${fmtNum(Math.round(est))}`,
      );
    }
  }

  // Header
  const header = [
    `${colors.bold('Parallel uploader')} — ${poolSize} workers ${colors.dim(
      `(CPU avail: ${cpuCount})`,
    )}`,
    `${colors.dim('Files')} ${fmtNum(filesTotal)}  ${colors.dim(
      'Completed',
    )} ${fmtNum(filesCompleted)}  ${colors.dim('Failed')} ${redIf(
      filesFailed,
      fmtNum(filesFailed),
    )}  ${colors.dim('In-flight')} ${fmtNum(inProgress)}`,
    `[${bar}] ${pct}%  ${estTotalJobsText}`,
  ];

  if (exportsDir) {
    header.push(colors.dim(`Exports dir: ${exportsDir}`));
  }

  // Totals block
  let totalsBlock = '';
  if (totals) {
    if (totals.mode === 'upload') {
      const t = totals as UploadModeTotals;
      const errorsList = Object.entries(t.errors || {}).map(
        ([msg, count]) =>
          `  ${colors.red(`Count[${fmtNum(count)}]`)} ${colors.red(msg)}`,
      );
      totalsBlock = [
        errorsList.length
          ? `${colors.bold('Error breakdown:')}\n${errorsList.join('\n')}`
          : '',
        `${colors.bold('Receipts totals')} — Success: ${fmtNum(
          t.success,
        )}  Skipped: ${fmtNum(t.skipped)}  Error: ${redIf(
          t.error,
          fmtNum(t.error),
        )}`,
      ]
        .filter(Boolean)
        .join('\n\n');
    } else {
      const t = totals as CheckModeTotals;
      totalsBlock =
        `${colors.bold('Receipts totals')} — Pending: ${fmtNum(
          t.totalPending,
        )}  ` +
        `PendingConflicts: ${fmtNum(t.pendingConflicts)}  PendingSafe: ${fmtNum(
          t.pendingSafe,
        )}  ` +
        `Skipped: ${fmtNum(t.skipped)}`;
    }
  }

  // Throughput (records/hour)
  const tp = throughput
    ? (() => {
        const perHour10 = Math.round(throughput.r10s * 3600);
        const perHour60 = Math.round(throughput.r60s * 3600);
        return `Throughput: ${fmtNum(perHour10)}/hr (1h: ${fmtNum(
          perHour60,
        )}/hr)  Newly uploaded this run: ${fmtNum(throughput.successSoFar)}`;
      })()
    : '';

  // Per-worker lines
  const miniWidth = 18;
  const workerLines = [...workerState.entries()].map(([id, s]) => {
    const badge =
      s.lastLevel === 'error'
        ? colors.red('ERROR ')
        : s.lastLevel === 'warn'
        ? colors.yellow('WARN  ')
        : s.busy
        ? colors.green('WORKING')
        : colors.dim('IDLE   ');

    const fname = s.file ? basename(s.file) : '-';
    const elapsed = s.startedAt
      ? `${Math.floor((Date.now() - s.startedAt) / 1000)}s`
      : '-';

    const processed = s.progress?.processed ?? 0;
    const total = s.progress?.total ?? 0;
    const pctw = total > 0 ? Math.floor((processed / total) * 100) : 0;
    const ff = Math.floor((pctw / 100) * miniWidth);
    const mini =
      total > 0
        ? '█'.repeat(ff) + '░'.repeat(miniWidth - ff)
        : ' '.repeat(miniWidth);
    const miniTxt =
      total > 0
        ? `${fmtNum(processed)}/${fmtNum(total)} (${pctw}%)`
        : colors.dim('—');

    return `  [w${id}] ${badge} | ${fname} | ${elapsed} | [${mini}] ${miniTxt}`;
  });

  // Multi-line hotkeys + always-visible export targets
  const makeExportLine = (
    key: 'E' | 'W' | 'I' | 'A' | 'F',
    label: string,
    status?: ExportArtifactStatus,
    fallbackName?: string, // used if status.path is missing
  ): string => {
    const exported = !!status?.exported;
    const path =
      status?.path ||
      (exportsDir
        ? join(
            exportsDir,
            fallbackName ?? `${label.toLowerCase().replace(/\s+/g, '-')}.log`,
          )
        : '(set exportsDir)');
    const time = fmtTime(status?.savedAt);
    const prefix = exported ? colors.green('●') : colors.dim('○');
    const text = `${prefix}: ${key}=export-${label}: ${path}  ${colors.dim(
      `(last saved: ${time})`,
    )}`;
    return exported ? colors.green(text) : colors.dim(text);
  };

  const hotkeysHeader = colors.dim(
    'Hotkeys: digits attach • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+C exit',
  );

  const hotkeyExportLines = [
    makeExportLine('E', 'errors', exportStatus.error, 'combined-errors.log'),
    makeExportLine('W', 'warns', exportStatus.warn, 'combined-warns.log'),
    makeExportLine('I', 'info', exportStatus.info, 'combined-info.log'),
    makeExportLine('A', 'all', exportStatus.all, 'combined-all.log'),
    makeExportLine(
      'F',
      'failures-csv',
      exportStatus.failuresCsv,
      'failing-updates.csv',
    ),
  ];

  const frame = [
    ...header,
    tp ? colors.cyan(tp) : '',
    totalsBlock ? `\n${totalsBlock}` : '',
    '',
    ...workerLines,
    '',
    hotkeysHeader,
    ...hotkeyExportLines,
  ]
    .filter(Boolean)
    .join('\n');

  if (!final && frame === lastFrame) return;
  lastFrame = frame;

  if (!final) {
    process.stdout.write('\x1b[?25l');
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  } else {
    process.stdout.write('\x1b[?25h');
  }
  process.stdout.write(`${frame}\n`);
}

/* ------------------------------------------------------------
 * Export helpers (used by key handlers in impl.ts)
 * ------------------------------------------------------------ */

/**
 *
 * @param slotLogPaths
 * @param kind
 * @param outDir
 */
export async function exportCombinedLogs(
  slotLogPaths: Map<number, ReturnType<typeof getWorkerLogPaths> | undefined>,
  kind: LogExportKind,
  outDir: string,
): Promise<string> {
  mkdirSync(outDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath =
    kind === 'error'
      ? join(outDir, `combined-errors-${ts}.log`)
      : kind === 'warn'
      ? join(outDir, `combined-warns-${ts}.log`)
      : kind === 'info'
      ? join(outDir, `combined-info-${ts}.log`)
      : join(outDir, `combined-all-${ts}.log`);

  const lines: string[] = [];

  for (const [, paths] of slotLogPaths) {
    if (!paths) continue;

    const readSafe = (p?: string) => {
      try {
        return p ? readFileSync(p, 'utf8') : '';
      } catch {
        return '';
      }
    };

    if (kind === 'all') {
      const blobs = [
        paths.outPath,
        paths.errPath,
        (paths as any).structuredPath,
      ]
        .filter(Boolean)
        .map((p) => readSafe(p));
      blobs.forEach((text) => {
        if (!text) return;
        lines.push(...text.split('\n').filter(Boolean));
      });
      continue;
    }

    if (kind === 'info') {
      const infoPath = (paths as any).infoPath as string | undefined;
      const text = readSafe(infoPath) || readSafe(paths.outPath);
      if (!text) continue;
      lines.push(...text.split('\n').filter(Boolean));
      continue;
    }

    if (kind === 'warn') {
      const warnPath = (paths as any).warnPath as string | undefined;
      let text = readSafe(warnPath);
      if (!text) {
        const stderr = readSafe(paths.errPath);
        if (stderr) {
          const blocks = extractBlocks(
            stderr,
            (cl) => isWarn(cl) && !isError(cl),
          );
          if (blocks.length) text = blocks.join('\n\n');
        }
      }
      if (!text) continue;
      lines.push(...text.split('\n').filter(Boolean));
      continue;
    }

    // kind === 'error'
    const errorPath = (paths as any).errorPath as string | undefined;
    let text = readSafe(errorPath);
    if (!text) {
      const stderr = readSafe(paths.errPath);
      if (stderr) {
        const blocks = extractBlocks(stderr, (cl) => isError(cl));
        if (blocks.length) text = blocks.join('\n\n');
      }
    }
    if (!text) continue;
    lines.push(...text.split('\n').filter(Boolean));
  }

  // naive time-sort
  lines.sort((a, b) => {
    const ta = a.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0] ?? '';
    const tb = b.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0] ?? '';
    return ta.localeCompare(tb);
  });

  writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  return outPath;
}

/**
 *
 * @param rows
 * @param outPath
 */
export async function writeFailingUpdatesCsv(
  rows: Array<Record<string, unknown>>,
  outPath: string,
): Promise<string> {
  mkdirSync(join(outPath, '..'), { recursive: true });

  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row || {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );

  const esc = (v: unknown): string => {
    if (v == null) return '';
    const s =
      typeof v === 'string'
        ? v
        : typeof v === 'object'
        ? JSON.stringify(v)
        : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(',')),
  ];

  writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  return outPath;
}
