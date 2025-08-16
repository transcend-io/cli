// spawnWorkerProcess.ts
import { fork, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { openLogTailWindowMulti } from './openTerminal';

export const CHILD_FLAG = '--child-upload-preferences';

export interface WorkerLogPaths {
  /** */
  structuredPath: string;
  /** */
  outPath: string;
  /** */
  errPath: string;
}

// Symbol key so we can stash/retrieve paths on the child proc safely
const LOG_PATHS_SYM: unique symbol = Symbol('workerLogPaths');

/**
 *
 * @param pathStr
 */
function ensureLogFile(pathStr: string) {
  try {
    const w = createWriteStream(pathStr, { flags: 'a' });
    w.end();
  } catch {}
}

/**
 * Spawn a worker process with piped stdio and persisted logs.
 * - stdin/stdout/stderr = 'pipe' so we can attach interactively
 * - stdout/stderr also go to per-worker files (.out/.err)
 * - worker writes structured logs to WORKER_LOG (structuredPath)
 *
 * @param id
 * @param modulePath
 * @param logDir
 * @param openLogWindows
 * @param isSilent
 */
export function spawnWorkerProcess(
  id: number,
  modulePath: string,
  logDir: string,
  openLogWindows: boolean,
  isSilent: boolean,
): ChildProcess {
  const structuredPath = join(logDir, `worker-${id}.log`);
  const outPath = join(logDir, `worker-${id}.out.log`);
  const errPath = join(logDir, `worker-${id}.err.log`);
  [structuredPath, outPath, errPath].forEach(ensureLogFile);

  const child = fork(modulePath, ['--child-upload-preferences'], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, WORKER_ID: String(id), WORKER_LOG: structuredPath },
    execArgv: process.execArgv,
  });

  // Persist stdout/stderr to files
  const outStream = createWriteStream(outPath, { flags: 'a' });
  const errStream = createWriteStream(errPath, { flags: 'a' });
  child.stdout?.pipe(outStream);
  child.stderr?.pipe(errStream);

  // Headers so tail windows show something immediately
  outStream.write(
    `[parent] stdout capture active for w${id} (pid ${child.pid})\n`,
  );
  errStream.write(
    `[parent] stderr capture active for w${id} (pid ${child.pid})\n`,
  );

  // Stash log path metadata on the child
  (child as any)[LOG_PATHS_SYM] = {
    structuredPath,
    outPath,
    errPath,
  } as WorkerLogPaths;

  if (openLogWindows) {
    openLogTailWindowMulti(
      [structuredPath, outPath, errPath],
      `worker-${id}`,
      isSilent,
    );
  }

  outStream.on('error', () => {});
  errStream.on('error', () => {});

  return child;
}

/**
 * Retrieve the paths we stashed on the child.
 *
 * @param child
 */
export function getWorkerLogPaths(
  child: ChildProcess,
): WorkerLogPaths | undefined {
  return (child as any)[LOG_PATHS_SYM] as WorkerLogPaths | undefined;
}
