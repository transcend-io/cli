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
 * @param poolSize
 * @param cpuCount
 * @param total
 * @param completed
 * @param failed
 * @param workerState
 */
export function renderDashboard(
  poolSize: number,
  cpuCount: number,
  total: number,
  completed: number,
  failed: number,
  workerState: Map<number, WorkerState>,
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
  const frame = [
    `Parallel uploader — ${poolSize} workers (CPU avail: ${cpuCount})`,
    `Files: ${total}  Completed: ${completed}  Failed: ${failed}  In-flight: ${inProgress}`,
    `[${bar}] ${pct}%`,
    '',
    ...lines,
    '',
    `Hotkeys: [${digitRange}] attach • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+C exit`,
  ].join('\n');

  if (frame === lastFrame) return;
  lastFrame = frame;

  process.stdout.write('\x1b[?25l');
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  process.stdout.write(`${frame}\n`);
}
