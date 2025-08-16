// renderer.ts
import { basename } from 'node:path';
import * as readline from 'node:readline';

export interface WorkerState {
  /** */
  busy: boolean;
  /** */
  file?: string | null;
  /** */
  startedAt?: number | null;
  /** last severity seen from worker stderr */
  lastLevel?: 'ok' | 'warn' | 'error';
}

let lastFrame = '';

/**
 *
 */
type UploadModeTotals = {
  /** */
  mode: 'upload';
  /** */
  success: number;
  /** */
  skipped: number;
  /** */
  error: number;
  /** aggregated error message -> count */
  errors: Record<string, number>;
};
/**
 *
 */
type CheckModeTotals = {
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
/**
 *
 */
type AnyTotals = UploadModeTotals | CheckModeTotals;
/**
 *
 */
type RenderOpts = {
  /** */ final?: boolean;
};

// minimal color helpers (avoid extra deps)
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

/**
 *
 * @param poolSize
 * @param cpuCount
 * @param total
 * @param completed
 * @param failed
 * @param workerState
 * @param totals
 * @param opts
 */
export function renderDashboard(
  poolSize: number,
  cpuCount: number,
  total: number,
  completed: number,
  failed: number,
  workerState: Map<number, WorkerState>,
  totals?: AnyTotals,
  opts?: RenderOpts,
): void {
  const inProgress = [...workerState.values()].filter((s) => s.busy).length;
  const pct =
    total === 0
      ? 100
      : Math.floor(((completed + failed) / Math.max(1, total)) * 100);
  const barWidth = 40;
  const filled = Math.floor((pct / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  const lines = [...workerState.entries()].map(([id, s]) => {
    let label = s.busy ? 'WORKING' : 'IDLE   ';
    if (s.lastLevel === 'error') label = red('ERROR ');
    else if (s.lastLevel === 'warn') label = yellow('WARN  ');

    const fname = s.file ? basename(s.file) : '-';
    const elapsed = s.startedAt
      ? `${Math.floor((Date.now() - s.startedAt) / 1000)}s`
      : '-';
    return `  [w${id}] ${label} | ${fname} | ${elapsed}`;
  });

  const maxDigit = Math.min(poolSize - 1, 9);
  const digitRange = poolSize <= 1 ? '0' : `0-${maxDigit}`;

  let totalsLine = '';
  if (totals) {
    if (totals.mode === 'upload') {
      const fmt = (n: number) => n.toLocaleString();
      const errorBreakdown = Object.entries(
        (totals as UploadModeTotals).errors || {},
      )
        .map(([k, v]) => ` Count[${fmt(v as number)}] ${k}`)
        .join('\n');
      totalsLine = `${
        errorBreakdown
          ? `\n\nThe individual error breakdown is:\n\n${errorBreakdown}\n\n`
          : ''
      }Receipts totals — Success: ${fmt(totals.success)}  Skipped: ${fmt(
        totals.skipped,
      )}  Error: ${fmt(totals.error)}`;
    } else {
      totalsLine =
        `Receipts totals — Pending: ${totals.totalPending}  PendingConflicts: ${totals.pendingConflicts}  ` +
        `PendingSafe: ${totals.pendingSafe}  Skipped: ${totals.skipped}`;
    }
  }

  const isFinal = !!opts?.final;
  const hotkeysLine = isFinal
    ? 'Run complete — digits to view logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • q to quit'
    : `Hotkeys: [${digitRange}] attach • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+C exit`;

  const frame = [
    `Parallel uploader — ${poolSize} workers (CPU avail: ${cpuCount})`,
    totalsLine,
    `Files: ${total}  Completed: ${completed}  Failed: ${failed}  In-flight: ${inProgress}`,
    `[${bar}] ${pct}%`,
    '',
    ...lines,
    '',
    hotkeysLine,
  ]
    .filter(Boolean)
    .join('\n');

  if (!isFinal && frame === lastFrame) return;
  lastFrame = frame;

  if (!isFinal) {
    process.stdout.write('\x1b[?25l');
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  } else {
    process.stdout.write('\x1b[?25h');
  }

  process.stdout.write(`${frame}\n`);
}
