import colors from 'colors';
import { basename } from 'node:path';
import type { CommonCtx } from './dashboardPlugin';
import type { ObjByString } from '@transcend-io/type-utils';

/**
 * Progress snapshot for a worker slot in the chunk-csv command.
 */
export type ChunkSlotProgress = {
  /** Absolute path of the file being processed by this worker. */
  filePath?: string;
  /** Number of rows processed so far in this file. */
  processed?: number;
  /** Optional total number of rows in the file (if known). */
  total?: number;
};

/**
 * Format a number safely for display.
 *
 * @param n - The number to format (or `undefined`).
 * @returns A localized string representation, or "0".
 */
export function fmtNum(n: number | undefined): string {
  return typeof n === 'number' ? n.toLocaleString() : '0';
}

/**
 * Draw a horizontal bar of length `width` filled to `pct` percent.
 *
 * @param pct - Percentage 0..100.
 * @param width - Number of characters in the bar.
 * @returns A string like "████░░░░".
 */
export function pctBar(pct: number, width = 40): string {
  const clamped = Math.max(0, Math.min(100, Math.floor(pct)));
  const filled = Math.floor((clamped / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Compute pool-wide progress values needed by headers.
 *
 * @param ctx - Dashboard context containing pool state, worker state, totals, etc.
 * @returns An object with `done`, `inProgress`, and `pct` properties.
 */
export function poolProgress<TTotals, TSlot extends ObjByString>(
  ctx: CommonCtx<TTotals, TSlot>,
): {
  /** Count of successfully completed files/tasks. */
  done: number;
  /** Count of currently in-progress files/tasks. */
  inProgress: number;
  /** Percentage of completion (0-100). */
  pct: number;
} {
  const inProgress = [...ctx.workerState.values()].filter((s) => s.busy).length;
  const done = ctx.filesCompleted + ctx.filesFailed;
  const pct =
    ctx.filesTotal === 0
      ? 100
      : Math.floor((done / Math.max(1, ctx.filesTotal)) * 100);
  return { done, inProgress, pct };
}

/**
 * Compose the common header lines (title, pool stats, progress bar, throughput).
 *
 * @param ctx - Dashboard context.
 * @param extraLines - Optional extra lines (e.g., totals block).
 * @returns Header lines.
 */
export function makeHeader<TTotals, TSlot extends ObjByString>(
  ctx: CommonCtx<TTotals, TSlot>,
  extraLines: string[] = [],
): string[] {
  const {
    title,
    poolSize,
    cpuCount,
    filesTotal,
    filesCompleted,
    filesFailed,
    throughput,
  } = ctx;
  const { inProgress, pct } = poolProgress(ctx);

  const lines: string[] = [
    `${colors.bold(title)} — ${poolSize} workers ${colors.dim(
      `(CPU avail: ${cpuCount})`,
    )}`,
    `${colors.dim('Files')} ${fmtNum(filesTotal)}  ${colors.dim(
      'Completed',
    )} ${fmtNum(filesCompleted)}  ${colors.dim('Failed')} ${
      filesFailed ? colors.red(fmtNum(filesFailed)) : fmtNum(filesFailed)
    }  ${colors.dim('In-flight')} ${fmtNum(inProgress)}`,
    `[${pctBar(pct)}] ${pct}%`,
  ];

  if (throughput) {
    const perHour10 = Math.round(throughput.r10s * 3600).toLocaleString();
    const perHour60 = Math.round(throughput.r60s * 3600).toLocaleString();
    const suffix =
      ctx.throughput?.successSoFar != null
        ? `  Newly uploaded: ${fmtNum(ctx.throughput.successSoFar)}`
        : '';
    lines.push(
      colors.cyan(`Throughput: ${perHour10}/hr (1h: ${perHour60}/hr)${suffix}`),
    );
  }

  return extraLines.length ? lines.concat(extraLines) : lines;
}

/**
 * Render per-worker rows with a compact progress bar and status badge.
 *
 * @param ctx - Dashboard context (slot progress type must have processed/total?).
 * @param getFileLabel - Optional: override how the filename is shown.
 * @returns Array of strings, each representing one worker row.
 */
export function makeWorkerRows<
  TTotals,
  TSlot extends Omit<ChunkSlotProgress, 'filePath'>,
>(
  ctx: CommonCtx<TTotals, TSlot>,
  getFileLabel: (file: string | null | undefined) => string = (file) =>
    file ? basename(file) : '-',
): string[] {
  const miniWidth = 18;

  return [...ctx.workerState.entries()].map(([id, s]) => {
    const badge =
      s.lastLevel === 'error'
        ? colors.red('ERROR ')
        : s.lastLevel === 'warn'
        ? colors.yellow('WARN  ')
        : s.busy
        ? colors.green('WORKING')
        : colors.dim('IDLE   ');

    const fname = getFileLabel(s.file);
    const elapsed = s.startedAt
      ? `${Math.floor((Date.now() - s.startedAt) / 1000)}s`
      : '-';

    const processed = s.progress?.processed ?? 0;
    const total = s.progress?.total ?? 0;
    const pctw = total > 0 ? Math.floor((processed / total) * 100) : 0;
    const mini = total > 0 ? pctBar(pctw, miniWidth) : ' '.repeat(miniWidth);
    const miniTxt =
      total > 0
        ? `${processed.toLocaleString()}/${total.toLocaleString()} (${pctw}%)`
        : colors.dim('—');

    return `  [w${id}] ${badge} | ${fname} | ${elapsed} | [${mini}] ${miniTxt}`;
  });
}
