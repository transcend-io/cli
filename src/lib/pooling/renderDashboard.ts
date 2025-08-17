// renderDashboard.ts — rewritten to make export artifacts easy to OPEN / REVEAL / COPY
// - Keeps the existing dashboard renderer and export helpers
// - Adds cross‑platform helpers: openExport, revealExport, copyExportPath
// - Prints OSC‑8 hyperlinks *and* plain absolute paths *and* file:// URLs
// - Writes a sidecar index file with the latest artifact paths for quick copy

import { basename, dirname, join, resolve } from 'node:path';
import colors from 'colors';
import * as readline from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import type { WorkerState } from './assignWorkToWorker';
import type { getWorkerLogPaths } from './spawnWorkerProcess';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

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
/**
 *
 */
export type ExportKindWithCsv = LogExportKind | 'failures-csv';

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
  /** */
  poolSize: number; // Number of live workers in the pool
  /** */
  cpuCount: number; // CPU count hint shown to user

  /** */
  filesTotal: number; // Total files discovered at start
  /** */
  filesCompleted: number; // Completed files count
  /** */
  filesFailed: number; // Failed files count

  /** */
  workerState: Map<number, WorkerState>; // Live map of worker state
  /** */
  totals?: AnyTotals; // Mode-specific aggregates
  /** */
  final?: boolean; // Final frame? If true, show the cursor and freeze the output

  /** */
  throughput?: {
    /** */
    successSoFar: number;
    /** */
    r10s: number;
    /** */
    r60s: number;
  };

  /** Directory where export artifacts (combined logs / CSV) are written. */
  exportsDir?: string;

  /** Current (latest) artifact status per kind. */
  exportStatus?: ExportStatusMap;
}

let lastFrame = '';
let lastIndexFileContents = '';

/* ------------------------------------------------------------
 * Small helpers
 * ------------------------------------------------------------ */

const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, '');
const isError = (t: string) =>
  /\b(ERROR|uncaughtException|unhandledRejection)\b/i.test(t);
const isWarn = (t: string) => /\b(WARN|WARNING)\b/i.test(t);

const fmtNum = (n: number): string => n.toLocaleString();
const fmtTime = (ts?: number): string =>
  ts ? new Date(ts).toLocaleTimeString() : '—';

/**
 *
 * @param t
 */
function isNewHeader(t: string) {
  return (
    isError(t) ||
    isWarn(t) ||
    /^\s*\[w\d+\]/.test(t) ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(t)
  );
}

/**
 *
 * @param absPath
 * @param label
 */
function osc8Link(absPath: string, label?: string): string {
  if (!absPath || absPath.startsWith('(')) return label ?? absPath; // Skip placeholders
  try {
    const { href } = pathToFileURL(absPath); // file:///… URL
    const OSC = '\u001B]8;;';
    const BEL = '\u0007';
    const text = label ?? absPath; // may contain SGR color codes
    return `${OSC}${href}${BEL}${text}${OSC}${BEL}`;
  } catch {
    return label ?? absPath;
  }
}

/**
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

/**
 * Compute an absolute path for a would‑be artifact (even before it exists).
 *
 * @param kind
 * @param exportsDir
 * @param status
 */
function artifactAbsPath(
  kind: ExportKindWithCsv,
  exportsDir?: string,
  status?: ExportArtifactStatus,
): string {
  const fallbackName =
    kind === 'error'
      ? 'combined-errors.log'
      : kind === 'warn'
      ? 'combined-warns.log'
      : kind === 'info'
      ? 'combined-info.log'
      : kind === 'all'
      ? 'combined-all.log'
      : 'failing-updates.csv';

  const rawPath =
    status?.path ||
    (exportsDir ? join(exportsDir, fallbackName) : '(set exportsDir)');
  return rawPath.startsWith('(') ? rawPath : resolve(rawPath);
}

/**
 * Create (if needed) an exports index file summarizing artifact paths.
 *
 * @param exportsDir
 * @param exportStatus
 */
function writeExportsIndex(
  exportsDir?: string,
  exportStatus?: ExportStatusMap,
): string | undefined {
  if (!exportsDir) return undefined;
  const lines: string[] = ['# Export artifacts — latest paths', ''];

  const kinds: Array<
    [ExportKindWithCsv, ExportArtifactStatus | undefined, string]
  > = [
    ['error', exportStatus?.error, 'Errors log'],
    ['warn', exportStatus?.warn, 'Warnings log'],
    ['info', exportStatus?.info, 'Info log'],
    ['all', exportStatus?.all, 'All logs'],
    ['failures-csv', exportStatus?.failuresCsv, 'Failing updates (CSV)'],
  ];

  for (const [k, st, label] of kinds) {
    const abs = artifactAbsPath(k, exportsDir, st);
    const url = abs.startsWith('(') ? abs : pathToFileURL(abs).href;
    lines.push(`${label}:`);
    lines.push(`  path: ${abs}`);
    lines.push(`  url:  ${url}`);
    lines.push('');
  }

  const content = lines.join('\n');
  if (content === lastIndexFileContents) return join(exportsDir, 'exports.index.txt');

  mkdirSync(exportsDir, { recursive: true });
  const out = join(exportsDir, 'exports.index.txt');
  writeFileSync(out, `${content}\n`, 'utf8');
  lastIndexFileContents = content;
  return out;
}

/* ------------------------------------------------------------
 * Cross‑platform OPEN / REVEAL / COPY helpers
 * ------------------------------------------------------------ */

/**
 *
 * @param cmd
 * @param args
 */
function spawnDetached(cmd: string, args: string[]) {
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 *
 * @param p
 */
async function openPath(p: string): Promise<boolean> {
  if (!p || p.startsWith('(')) return false;
  if (process.platform === 'darwin') return spawnDetached('open', [p]);
  if (process.platform === 'win32') return spawnDetached('cmd', ['/c', 'start', '', p]);
  return spawnDetached('xdg-open', [p]);
}

/**
 *
 * @param p
 */
async function revealInFileManager(p: string): Promise<boolean> {
  if (!p || p.startsWith('(')) return false;
  if (process.platform === 'darwin') return spawnDetached('open', ['-R', p]);
  if (process.platform === 'win32') return spawnDetached('explorer.exe', ['/select,', p]);
  // Linux: best effort — open folder
  return spawnDetached('xdg-open', [dirname(p)]);
}

/**
 *
 * @param text
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || text.startsWith('(')) return false;
  try {
    if (process.platform === 'darwin') {
      const p = spawn('pbcopy');
      p.stdin?.write(text);
      p.stdin?.end();
      return true;
    }
    if (process.platform === 'win32') {
      const p = spawn('clip');
      p.stdin?.write(text.replace(/\n/g, '\r\n'));
      p.stdin?.end();
      return true;
    }
    // Linux: try xclip, then xsel
    try {
      const p = spawn('xclip', ['-selection', 'clipboard']);
      p.stdin?.write(text);
      p.stdin?.end();
      return true;
    } catch {}
    try {
      const p2 = spawn('xsel', ['--clipboard', '--input']);
      p2.stdin?.write(text);
      p2.stdin?.end();
      return true;
    } catch {}
  } catch {}
  return false;
}

/**
 * Action helpers you can call from your key handlers in impl.ts
 *
 * @param kind
 * @param exportsDir
 * @param exportStatus
 */
export async function openExport(
  kind: ExportKindWithCsv,
  exportsDir?: string,
  exportStatus?: ExportStatusMap,
): Promise<{
  /** */ ok: boolean /** */;
  /** */
  path: string;
}> {
  const path = artifactAbsPath(kind, exportsDir, (exportStatus as any)?.[kind]);
  return { ok: await openPath(path), path };
}

/**
 *
 * @param kind
 * @param exportsDir
 * @param exportStatus
 */
export async function revealExport(
  kind: ExportKindWithCsv,
  exportsDir?: string,
  exportStatus?: ExportStatusMap,
): Promise<{
  /** */ ok: boolean /** */;
  /** */
  path: string;
}> {
  const path = artifactAbsPath(kind, exportsDir, (exportStatus as any)?.[kind]);
  return { ok: await revealInFileManager(path), path };
}

/**
 *
 * @param kind
 * @param exportsDir
 * @param exportStatus
 */
export async function copyExportPath(
  kind: ExportKindWithCsv,
  exportsDir?: string,
  exportStatus?: ExportStatusMap,
): Promise<{
  /** */ ok: boolean /** */;
  /** */
  path: string;
}> {
  const path = artifactAbsPath(kind, exportsDir, (exportStatus as any)?.[kind]);
  return { ok: await copyToClipboard(path), path };
}

/* ------------------------------------------------------------
 * Main renderer
 * ------------------------------------------------------------ */

/**
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

  // Estimate expected completion time (ETA)
  let etaText = '';
  if (throughput && estTotalJobsText && avgJobsPerCompletedFile !== undefined) {
    const est =
      (jobsFromReceipts ?? 0) +
      inflightJobsKnown +
      remainingFiles * avgJobsPerCompletedFile;
    const uploaded = throughput.successSoFar;
    const remainingJobs = Math.max(est - uploaded, 0);
    const ratePerSec = throughput.r60s > 0 ? throughput.r60s : throughput.r10s;
    if (ratePerSec > 0 && remainingJobs > 0) {
      const secondsLeft = Math.round(remainingJobs / ratePerSec);
      const eta = new Date(Date.now() + secondsLeft * 1000);
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const timeLeft =
        hours > 0
          ? `${hours}h ${minutes}m`
          : minutes > 0
          ? `${minutes}m`
          : `${secondsLeft}s`;
      etaText = colors.magenta(
        `Expected completion: ${eta.toLocaleTimeString()} (${timeLeft} left)`,
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
    `[${bar}] ${pct}%  ${estTotalJobsText} ${etaText}`,
  ];

  if (exportsDir) header.push(colors.dim(`Exports dir: ${exportsDir}`));

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

  // Base hotkeys (viewer keys rendered like before; export keys moved below)
  const maxDigit = Math.min(poolSize - 1, 9);
  const digitRange = poolSize <= 1 ? '0' : `0-${maxDigit}`;
  const extra = poolSize > 10 ? ' (Tab/Shift+Tab for ≥10)' : '';
  const hotkeysLine = final
    ? colors.dim(
        'Run complete — digits to view logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • q to quit',
      )
    : colors.dim(
        `Hotkeys: [${digitRange}] attach${extra} • e=errors • w=warnings • i=info • l=logs • Tab/Shift+Tab • Esc/Ctrl+] detach • Ctrl+C exit`,
      );

  // Pretty export block — one line per export key with path + indicator
  const makeExportLine = (
    key: 'E' | 'W' | 'I' | 'A' | 'F',
    label: string,
    status?: ExportArtifactStatus,
    fallbackName?: string,
  ): string => {
    const exported = !!status?.exported;

    const rawPath =
      status?.path ||
      (exportsDir
        ? join(
            exportsDir,
            fallbackName ?? `${label.toLowerCase().replace(/\s+/g, '-')}.log`,
          )
        : '(set exportsDir)');

    const abs = rawPath.startsWith('(') ? rawPath : resolve(rawPath);
    const time = fmtTime(status?.savedAt);
    const dot = exported ? colors.green('●') : colors.dim('○');
    const hotkey = colors.bold(`${key}=export-${label}`);

    const openText = exported ? colors.green('open') : colors.dim('open');
    const openLink = osc8Link(abs, openText);
    const plainPath = exported ? colors.green(abs) : colors.dim(abs);
    const url = abs.startsWith('(') ? abs : pathToFileURL(abs).href;

    return (
      `${dot} ${hotkey}: ${openLink}  ${plainPath} ${colors.dim(
        `(last saved: ${time})`,
      )}\n` + `      ${colors.dim('url:')} ${url}`
    );
  };

  const exportBlock = [
    colors.dim('Exports (Cmd/Ctrl‑click “open” or copy the plain path):'),
    `  ${makeExportLine(
      'E',
      'errors',
      exportStatus.error,
      'combined-errors.log',
    )}`,
    `  ${makeExportLine(
      'W',
      'warns',
      exportStatus.warn,
      'combined-warns.log',
    )}`,
    `  ${makeExportLine('I', 'info', exportStatus.info, 'combined-info.log')}`,
    `  ${makeExportLine('A', 'all', exportStatus.all, 'combined-all.log')}`,
    `  ${makeExportLine(
      'F',
      'failures-csv',
      exportStatus.failuresCsv,
      'failing-updates.csv',
    )}`,
    colors.dim('  (Also written to exports.index.txt for easy copying.)'),
  ].join('\n');

  // Optionally write/update the sidecar index file each frame (cheap I/O, guarded by memo)
  writeExportsIndex(exportsDir, exportStatus);

  const frame = [
    ...header,
    tp ? colors.cyan(tp) : '',
    totalsBlock ? `\n${totalsBlock}` : '',
    '',
    ...workerLines,
    '',
    hotkeysLine,
    exportBlock ? `\n${exportBlock}` : '',
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
