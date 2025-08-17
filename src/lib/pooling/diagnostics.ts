// diagnostics.ts
import type { ChildProcess } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkerState } from './assignWorkToWorker';
import { classifyLogLevel, makeLineSplitter } from './logRotation';

/**
 * Wire stderr to flip WARN/ERROR badges quickly.
 *
 * @param id - Worker ID
 * @param child - Child process
 * @param workerState - Map of worker states
 * @param repaint - Repaint function
 */
export function wireStderrBadges(
  id: number,
  child: ChildProcess,
  workerState: Map<number, WorkerState>,
  repaint: () => void,
): void {
  if (!child.stderr) return;

  const onErrLine = makeLineSplitter((line) => {
    // If there is an explicit tag, use it; otherwise since it came from stderr, treat as WARN.
    const explicit = classifyLogLevel(line); // 'warn' | 'error' | null
    const lvl = explicit ?? 'warn';
    const curr = workerState.get(id);
    if (!curr || curr.lastLevel === lvl) return;
    workerState.set(id, { ...curr, lastLevel: lvl });
    repaint();
  });

  child.stderr.on('data', onErrLine);
}

/**
 * Best-effort shared failure log write.
 *
 * @param logDir - Directory to write logs
 * @param workerId - Worker ID
 * @param filePath - File path being processed
 * @param error - Error message to log
 */
export function appendFailureLog(
  logDir: string,
  workerId: number,
  filePath: string,
  error: string,
): void {
  try {
    appendFileSync(
      join(logDir, 'failures.log'),
      `[${new Date().toISOString()}] worker ${workerId} file=${filePath}\n${error}\n\n`,
    );
  } catch {
    // ignore log write errors
  }
}
