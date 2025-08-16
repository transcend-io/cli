// logRotation.ts
import { readdirSync, statSync, truncateSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WORKER_LOG_RE = /^worker-\d+\.(?:log|out\.log|err\.log)$/;

/**
 * Reset worker logs in the given directory.
 * mode:
 *  - "truncate": empty files but keep them (best if tails are open)
 *  - "delete": remove files entirely (simplest if no tails yet)
 *
 * @param logDir
 * @param mode
 */
export function resetWorkerLogs(
  logDir: string,
  mode: 'truncate' | 'delete' = 'truncate',
): void {
  let entries: string[] = [];
  try {
    entries = readdirSync(logDir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (!WORKER_LOG_RE.test(name)) continue;
    const p = join(logDir, name);
    try {
      const st = statSync(p);
      if (!st.isFile()) continue;
      if (mode === 'truncate') truncateSync(p, 0);
      else rmSync(p, { force: true });
    } catch {
      // ignore individual failures
    }
  }
}
