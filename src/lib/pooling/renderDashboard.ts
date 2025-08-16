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
}

let lastFrame = '';

/**
 *
 */
type UploadModeTotals = {
  /** */ mode: 'upload' /** */;
  success: number /** */;
  skipped: number /** */;
  error: number;
};
/**
 *
 */
type CheckModeTotals = {
  /** */ mode: 'check' /** */;
  pendingConflicts: number /** */;
  pendingSafe: number /** */;
  totalPending: number /** */;
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
    const label = s.busy ? 'WORKING' : 'IDLE   ';
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
      totalsLine = `Receipts totals — Success: ${totals.success}  Skipped: ${totals.skipped}  Error: ${totals.error}`;
    } else {
      totalsLine =
        `Receipts totals — Pending: ${totals.totalPending}  PendingConflicts: ${totals.pendingConflicts}  ` +
        `PendingSafe: ${totals.pendingSafe}  Skipped: ${totals.skipped}`;
    }
  }

  const frame = [
    `Parallel uploader — ${poolSize} workers (CPU avail: ${cpuCount})`,
    `Files: ${total}  Completed: ${completed}  Failed: ${failed}  In-flight: ${inProgress}`,
    totalsLine,
    `[${bar}] ${pct}%`,
    '',
    ...lines,
    '',
    `Hotkeys: [${digitRange}] attach • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+C exit`,
  ]
    .filter(Boolean)
    .join('\n');

  const isFinal = !!opts?.final;

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
