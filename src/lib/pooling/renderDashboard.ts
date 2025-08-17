import { basename } from 'node:path';
import colors from 'colors';
import * as readline from 'node:readline';
import type { WorkerState } from './assignWorkToWorker';

/** Upload-mode totals (final-ish counters derived from receipts) */
export type UploadModeTotals = {
  /** Mode for uploading files --dryRun=false */
  mode: 'upload';
  /** Total number of successfully uploaded records */
  success: number;
  /** Total number of skipped records */
  skipped: number;
  /** Total number of error records */
  error: number;
  /** aggregated error message -> count */
  errors: Record<string, number>;
};

/** Check-mode totals (dry-run counters) */
export type CheckModeTotals = {
  /** Mode for checking files --dryRun=true */
  mode: 'check';
  /** Total number of pending conflict records */
  pendingConflicts: number;
  /** Total number of pending safe records */
  pendingSafe: number;
  /** Total number of pending records to update */
  totalPending: number;
  /** Total number of skipped records */
  skipped: number;
};

/** Total type for both upload and check modes. */
export type AnyTotals = UploadModeTotals | CheckModeTotals;

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
    /** total successful records observed so far (live, not just receipts) */
    successSoFar: number;
    /** short-window rate (e.g., 10s) */
    r10s: number;
    /** long-window rate (e.g., 60s) */
    r60s: number;
  };
}

let lastFrame = '';

/**
 * Render the multi-worker upload dashboard.
 *
 * Features:
 *  - Colored status badges per worker (WORKING=green, IDLE=dim, WARN=yellow, ERROR=red)
 *  - Global progress bar + per-worker mini bars (processed/total)
 *  - Combined receipts totals with thousands separators
 *  - Error breakdown in red
 *  - Live throughput (records/min) and a success counter
 *  - Estimated total jobs (records) based on receipts + in-flight + remainder
 *  - Hotkeys help: attach to worker, view combined warn/error/log
 *
 * This is a pure renderer: derive/prepare the data beforehand and pass it in.
 *
 * @param options - Options for rendering the dashboard
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
}: RenderDashboardInput): void {
  const fmt = (n: number): string => n.toLocaleString();
  const redIf = (n: number, s: string): string => (n > 0 ? colors.red(s) : s);

  const inProgress = [...workerState.values()].filter((s) => s.busy).length;

  // Global file-level progress bar (files)
  const completedFiles = filesCompleted + filesFailed;
  const pct =
    filesTotal === 0
      ? 100
      : Math.floor((completedFiles / Math.max(1, filesTotal)) * 100);
  const barWidth = 40;
  const filled = Math.floor((pct / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  // ---- Estimate TOTAL JOBS (records) -------------------------------------
  // Jobs completed so far from receipts (only reliable in upload mode)
  const jobsFromReceipts =
    totals && totals.mode === 'upload'
      ? (totals.success || 0) + (totals.skipped || 0) + (totals.error || 0)
      : undefined;

  // Jobs total for in-flight workers that reported their planned totals
  const inflightJobsKnown = [...workerState.values()].reduce((sum, s) => {
    const t = s.progress?.total ?? 0;
    return sum + (t > 0 && s.busy ? t : 0);
  }, 0);

  // Average jobs per completed file (only when we have receipts and ≥1 file done)
  const avgJobsPerCompletedFile =
    jobsFromReceipts !== undefined && completedFiles > 0
      ? jobsFromReceipts / completedFiles
      : undefined;

  // Remaining *files* not yet started (unknown job totals)
  const remainingFiles = Math.max(filesTotal - completedFiles - inProgress, 0);

  // Estimation strategy:
  //   estJobs = jobsFromReceipts + inflightKnown + remainingFiles * avgJobsPerCompletedFile
  // If we lack receipts (very early), try a softer fallback using in-flight averages.
  let estTotalJobsText = colors.dim('Est. total jobs: —');
  if (avgJobsPerCompletedFile !== undefined) {
    const est =
      (jobsFromReceipts ?? 0) +
      inflightJobsKnown +
      remainingFiles * avgJobsPerCompletedFile;
    estTotalJobsText = colors.dim(`Est. total jobs: ${fmt(Math.round(est))}`);
  } else if (inProgress > 0) {
    // Fallback: average planned total per in-flight file
    const avgInFlight =
      inflightJobsKnown > 0 ? inflightJobsKnown / inProgress : 0;
    if (avgInFlight > 0) {
      const est = inflightJobsKnown + remainingFiles * avgInFlight;
      estTotalJobsText = colors.dim(`Est. total jobs: ${fmt(Math.round(est))}`);
    }
  }
  // ------------------------------------------------------------------------

  // Header
  const header = [
    `${colors.bold('Parallel uploader')} — ${poolSize} workers ${colors.dim(
      `(CPU avail: ${cpuCount})`,
    )}`,
    `${colors.dim('Files')} ${fmt(filesTotal)}  ${colors.dim(
      'Completed',
    )} ${fmt(filesCompleted)}  ${colors.dim('Failed')} ${redIf(
      filesFailed,
      fmt(filesFailed),
    )}  ${colors.dim('In-flight')} ${fmt(inProgress)}`,
    `[${bar}] ${pct}%  ${estTotalJobsText}`,
  ];

  // Totals block
  let totalsBlock = '';
  if (totals) {
    if (totals.mode === 'upload') {
      const t = totals as UploadModeTotals;
      const errorsList = Object.entries(t.errors || {}).map(
        ([msg, count]) =>
          `  ${colors.red(`Count[${fmt(count)}]`)} ${colors.red(msg)}`,
      );
      totalsBlock = [
        errorsList.length
          ? `${colors.bold('Error breakdown:')}\n${errorsList.join('\n')}`
          : '',
        `${colors.bold('Receipts totals')} — Success: ${fmt(
          t.success,
        )}  Skipped: ${fmt(t.skipped)}  Error: ${redIf(t.error, fmt(t.error))}`,
      ]
        .filter(Boolean)
        .join('\n\n');
    } else {
      const t = totals as CheckModeTotals;
      totalsBlock =
        `${colors.bold('Receipts totals')} — Pending: ${fmt(
          t.totalPending,
        )}  ` +
        `PendingConflicts: ${fmt(t.pendingConflicts)}  PendingSafe: ${fmt(
          t.pendingSafe,
        )}  ` +
        `Skipped: ${fmt(t.skipped)}`;
    }
  }

  // Throughput (display as records/hour; inputs are per-second rates)
  const tp = throughput
    ? (() => {
        const perHour10 = Math.round(throughput.r10s * 3600);
        const perHour60 = Math.round(throughput.r60s * 3600);
        return (
          `Throughput: ${fmt(perHour10)}/hr (1h: ${fmt(perHour60)}/hr)  ` +
          `Newly uploaded this run: ${fmt(throughput.successSoFar)}`
        );
      })()
    : '';

  // Per-worker lines with mini progress bars
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

    // mini progress
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
        ? `${fmt(processed)}/${fmt(total)} (${pctw}%)`
        : colors.dim('—');

    return `  [w${id}] ${badge} | ${fname} | ${elapsed} | [${mini}] ${miniTxt}`;
  });

  // Hotkeys help
  const maxDigit = Math.min(poolSize - 1, 9);
  const digitRange = poolSize <= 1 ? '0' : `0-${maxDigit}`;
  const extra = poolSize > 10 ? ' (Tab/Shift+Tab for ≥10)' : '';
  const hotkeysLine = final
    ? colors.dim(
        'Run complete — digits to view logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • q to quit',
      )
    : colors.dim(
        `Hotkeys: [${digitRange}] attach${extra} • ` +
          'e=errors • w=warnings • l=logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+C exit',
      );

  const frame = [
    ...header,
    tp ? colors.cyan(tp) : '',
    totalsBlock ? `\n${totalsBlock}` : '',
    '',
    ...workerLines,
    '',
    hotkeysLine,
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
