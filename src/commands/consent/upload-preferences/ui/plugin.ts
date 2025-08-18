import colors from 'colors';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fmtNum, makeHeader, makeWorkerRows } from '../../../../lib/pooling';
import type { CommonCtx, DashboardPlugin } from '../../../../lib/pooling';
import { isUploadModeTotals, type AnyTotals } from './typeGuards';

/**
 * Per-slot progress payload used by the upload-preferences dashboard.
 * Workers may omit totals when unknown (e.g., streaming inputs).
 */
export type UploadPreferencesSlotProgress = {
  /** Absolute file path for the slot’s current unit of work. */
  filePath?: string;
  /** Records processed so far for this file (running count). */
  processed?: number;
  /** Optional total records for the file (not always known). */
  total?: number;
};

/**
 * Status for a single exported artifact (combined logs, CSV, etc.).
 * Stored in the `exportStatus` map passed via {@link CommonCtx.exportStatus}.
 */
type ExportArtifactStatus = {
  /** Absolute or relative path to the artifact on disk. */
  path?: string;
  /** Unix millis of the last successful save for this artifact. */
  savedAt?: number;
  /** Whether the artifact has been written at least once. */
  exported?: boolean;
};

/** Map of export slots (e.g., "error", "warn", "info", "all", "failuresCsv") to their status. */
type ExportStatusMap = Record<string, ExportArtifactStatus | undefined>;

/**
 * Format a timestamp for display in the exports panel.
 *
 * @param ts - Unix epoch milliseconds.
 * @returns Local time string or '—' if undefined.
 */
const fmtTime = (ts?: number): string =>
  ts ? new Date(ts).toLocaleTimeString() : '—';

/**
 * Create an OSC-8 hyperlink escape sequence for compatible terminals.
 *
 * @param abs - Absolute filesystem path to link to.
 * @param text - Link text to render.
 * @returns An OSC-8 hyperlink string.
 */
const osc8 = (abs: string, text: string): string =>
  `\u001B]8;;${pathToFileURL(abs).href}\u0007${text}\u001B]8;;\u0007`;

/**
 * Build the multi-line “receipts totals” block that appears under the header.
 * Upload mode shows success/skipped/error and an error breakdown; check mode
 * shows pending counts.
 *
 * @param t - Union of upload/check totals.
 * @returns A newline-joined string; empty string when no totals present.
 */
function totalsBlock(t?: AnyTotals): string {
  if (!t) return '';

  if (isUploadModeTotals(t)) {
    const errorsList = Object.entries(t.errors || {}).map(
      ([msg, count]) =>
        `  ${colors.red(`Count[${fmtNum(count)}]`)} ${colors.red(msg)}`,
    );
    return [
      errorsList.length
        ? `${colors.bold('Error breakdown:')}\n${errorsList.join('\n')}`
        : '',
      `${colors.bold('Receipts totals')} — Success: ${fmtNum(
        t.success,
      )}  Skipped: ${fmtNum(t.skipped)}  Error: ${
        t.error ? colors.red(fmtNum(t.error)) : fmtNum(t.error)
      }`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // Check mode
  return (
    `${colors.bold('Receipts totals')} — Pending: ${fmtNum(t.totalPending)}  ` +
    `PendingConflicts: ${fmtNum(t.pendingConflicts)}  ` +
    `PendingSafe: ${fmtNum(t.pendingSafe)}  ` +
    `Skipped: ${fmtNum(t.skipped)}`
  );
}

// --- helper: human ETA from seconds (keep yours if already present)
function fmtEta(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Compute avg jobs/file from receipts or inflight totals.
 *
 * @param ctx - Dashboard context with live totals and inflight state.
 * @returns Average jobs per file or undefined if not computable.
 */
function avgJobsPerFile(
  ctx: CommonCtx<AnyTotals, UploadPreferencesSlotProgress>,
): number | undefined {
  const completedFiles = ctx.filesCompleted + ctx.filesFailed;
  const { totals } = ctx;
  const jobsFromReceipts = isUploadModeTotals(totals)
    ? totals.success + totals.skipped + totals.error
    : undefined;

  if (jobsFromReceipts !== undefined && completedFiles > 0) {
    return jobsFromReceipts / completedFiles;
  }

  // fallback: infer from inflight known totals
  const inProgress = [...ctx.workerState.values()].filter((s) => s.busy);
  const inflightJobsKnown = inProgress.reduce((sum, s) => {
    const t = s.progress?.total ?? 0;
    return sum + (t > 0 ? t : 0);
  }, 0);
  if (inProgress.length > 0 && inflightJobsKnown > 0) {
    return inflightJobsKnown / inProgress.length;
  }
  return undefined;
}

/**
 * Estimate total jobs = processed + inflightKnown + remainingFiles * avgJobsPerFile
 *
 * @param ctx - Dashboard context with live totals and throughput.
 * @returns Estimated total jobs or undefined if not computable.
 */
function estimateTotalJobs(
  ctx: CommonCtx<AnyTotals, UploadPreferencesSlotProgress>,
): number | undefined {
  const { totals } = ctx;
  const completedFiles = ctx.filesCompleted + ctx.filesFailed;

  const jobsFromReceipts = isUploadModeTotals(totals)
    ? totals.success + totals.skipped + totals.error
    : undefined;

  const inProgress = [...ctx.workerState.values()].filter((s) => s.busy);
  const inflightJobsKnown = inProgress.reduce((sum, s) => {
    const t = s.progress?.total ?? 0;
    return sum + (t > 0 ? t : 0);
  }, 0);

  const avg = avgJobsPerFile(ctx);
  const remainingFiles = Math.max(
    0,
    ctx.filesTotal - completedFiles - inProgress.length,
  );

  if (avg !== undefined) {
    const processedBaseline = jobsFromReceipts ?? completedFiles * avg; // when receipts missing, approximate
    return processedBaseline + inflightJobsKnown + remainingFiles * avg;
  }
  return undefined;
}

/**
 * 1-hour *job* throughput = r60s (files/sec) × avgJobsPerFile × 3600.
 *
 * @param ctx - Dashboard context with live totals and throughput.
 * @returns Estimated jobs per hour based on 1-hour throughput.
 */
function jobsPerHour1h(
  ctx: CommonCtx<AnyTotals, UploadPreferencesSlotProgress>,
): number {
  const avg = avgJobsPerFile(ctx);
  const filesPerSec1h = ctx.throughput.r60s || 0;
  if (!avg || filesPerSec1h <= 0) return 0;
  return filesPerSec1h * avg * 3600;
}

/**
 * Build the single-line “Est. total jobs + ETA” exactly per requested formula.
 *
 * @param ctx - Dashboard context with live totals and throughput.
 * @returns A formatted string with estimated total jobs and ETA.
 */
function metricsLine(
  ctx: CommonCtx<AnyTotals, UploadPreferencesSlotProgress>,
): string {
  const { totals } = ctx;
  const est = estimateTotalJobs(ctx);

  const processedJobs = isUploadModeTotals(totals)
    ? totals.success + totals.skipped + totals.error
    : undefined;

  const estText = colors.dim(
    `Est. total jobs: ${est !== undefined ? fmtNum(Math.round(est)) : '—'}`,
  );

  let eta = '';
  if (est !== undefined && processedJobs !== undefined) {
    const jobsLeft = Math.max(0, est - processedJobs);
    const perHour = jobsPerHour1h(ctx); // <-- exactly the “1h throughput”
    if (perHour > 0 && jobsLeft > 0) {
      const secs = Math.ceil((jobsLeft / perHour) * 3600);
      eta = colors.magenta(`ETA ${fmtEta(secs)}`);
    }
  }

  return [estText, eta].filter(Boolean).join('  ');
}

/**
 * Render the dashboard header for the upload-preferences command.
 * Delegates common header lines to {@link makeHeader} and injects the
 * receipts totals block produced by {@link totalsBlock}.
 *
 * @param ctx - Dashboard context containing pool state and totals.
 * @returns An array of header lines.
 */
function renderHeader(
  ctx: CommonCtx<AnyTotals, UploadPreferencesSlotProgress>,
): string[] {
  const extras: string[] = [metricsLine(ctx)];
  const totals = totalsBlock(ctx.totals);
  if (totals) extras.push(totals);
  return makeHeader(ctx, extras);
}

/**
 * Render per-worker rows (one line per slot) using the common row builder.
 *
 * @param ctx - Dashboard context with live slot state.
 * @returns Worker row strings.
 */
function renderWorkers(
  ctx: CommonCtx<AnyTotals, UploadPreferencesSlotProgress>,
): string[] {
  return makeWorkerRows(ctx);
}

/**
 * Render the exports panel listing artifact links and last-saved timestamps.
 * Keys E/W/I/A/F are shown with OSC-8 links when possible and dimmed when
 * not yet exported.
 *
 * @param ctx - Dashboard context, optionally holding {@link ExportStatusMap}.
 * @returns Extra lines to append below the hotkeys hint.
 */
function renderExtras(
  ctx: CommonCtx<AnyTotals, UploadPreferencesSlotProgress>,
): string[] {
  const status = (ctx.exportStatus || {}) as ExportStatusMap;

  const line = (
    key: string,
    label: string,
    s?: ExportArtifactStatus,
  ): string => {
    const exported = !!s?.exported;
    const raw = s?.path || '(not saved yet)';

    const abs =
      raw.startsWith('(') || raw.startsWith('file:') ? raw : resolve(raw);

    const openText = exported ? colors.green('open') : colors.dim('open');

    // Build a file:// href (or keep sentinel/already-a-URL)
    const href = abs.startsWith('(')
      ? ''
      : abs.startsWith('file:')
      ? abs
      : pathToFileURL(abs).href;

    // Clickable "open" points to the file:// URL (no link when sentinel)
    const link = abs.startsWith('(') ? openText : osc8(href, openText);

    // Show ONLY the URL (no duplicate raw path)
    const shown = abs.startsWith('(')
      ? colors.dim(abs)
      : exported
      ? colors.green(href)
      : colors.dim(href);
    const dot = exported ? colors.green('●') : colors.dim('○');
    const time = fmtTime(s?.savedAt);

    return `${dot} ${colors.bold(
      `${key}=export-${label}`,
    )}: ${link}  ${shown} ${colors.dim(`(last saved: ${time})`)}`;
  };

  return [
    colors.dim('Exports (Cmd/Ctrl-click “open” or copy the plain path):'),
    `  ${line('E', 'errors', status.error)}`,
    `  ${line('W', 'warns', status.warn)}`,
    `  ${line('I', 'info', status.info)}`,
    `  ${line('A', 'all', status.all)}`,
    `  ${line('F', 'failures-csv', status.failuresCsv)}`,
    colors.dim('  (Also written to exports.index.txt for easy copying.)'),
  ];
}

/**
 * Dashboard plugin for the upload-preferences command.
 *
 * - **Header:** common header + receipts totals block
 * - **Workers:** compact per-slot progress rows
 * - **Extras:** export artifacts panel (errors/warns/info/all/failures-csv)
 */
export const uploadPreferencesPlugin: DashboardPlugin<
  AnyTotals,
  UploadPreferencesSlotProgress
> = {
  renderHeader,
  renderWorkers,
  renderExtras,
};
