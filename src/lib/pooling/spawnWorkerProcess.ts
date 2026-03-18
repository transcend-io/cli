import { fork, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { openLogTailWindowMulti } from './openTerminal';
import { ensureLogFile } from './ensureLogFile';
import { classifyLogLevel, makeLineSplitter } from './logRotation';

/** Default child-flag used if a caller doesn’t provide one. */
export const CHILD_FLAG = '--as-child';

// Symbol key so we can stash/retrieve paths on the child proc safely
const LOG_PATHS_SYM: unique symbol = Symbol('workerLogPaths');

export interface WorkerLogPaths {
  /** Structured (app-controlled) log file path written via WORKER_LOG */
  structuredPath: string;
  /** Raw stdout capture */
  outPath: string;
  /** Raw stderr capture */
  errPath: string;
  /** Lines classified as INFO (primarily stdout) */
  infoPath: string;
  /** Lines classified as WARN (from stderr without error tokens) */
  warnPath: string;
  /** Lines classified as ERROR (from stderr, including uncaught) */
  errorPath: string;
}

/** Convenience alias for the optional return from getWorkerLogPaths */
export type SlotPaths = Map<number, WorkerLogPaths | undefined>;

/**
 * Retrieve the paths we stashed on the child.
 *
 * @param child - The worker ChildProcess instance.
 * @returns The log paths or undefined if not set.
 */
export function getWorkerLogPaths(
  child: ChildProcess,
): WorkerLogPaths | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (child as any)[LOG_PATHS_SYM] as WorkerLogPaths | undefined;
}

/**
 * Is IPC channel still open? (Node doesn't type `.channel`)
 *
 * @param w - The worker ChildProcess instance.
 * @returns True if the IPC channel is open, false otherwise.
 */
export function isIpcOpen(w: ChildProcess | undefined | null): boolean {
  const ch = w && w.channel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(w && w.connected && ch && !(ch as any).destroyed);
}

/**
 * Safely send a message to the worker process.
 *
 * @param w - The worker ChildProcess instance.
 * @param msg - The message to send.
 * @returns True if the message was sent successfully, false otherwise.
 */
export function safeSend(w: ChildProcess, msg: unknown): boolean {
  if (!isIpcOpen(w)) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    w.send?.(msg as any);
    return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (
      err?.code === 'ERR_IPC_CHANNEL_CLOSED' ||
      err?.code === 'EPIPE' ||
      err?.errno === -32
    ) {
      return false;
    }
    throw err;
  }
}

export interface SpawnWorkerOptions {
  /** Worker slot/index */
  id: number;
  /** Absolute path to the module to fork (should handle CHILD_FLAG) */
  modulePath: string;
  /** Directory where log files will be written */
  logDir: string;
  /** If true, open tail windows for the log files */
  openLogWindows: boolean;
  /** If true, spawn with silent stdio (respect your existing setting) */
  isSilent: boolean;
  /** Optional override for the child flag (defaults to CHILD_FLAG) */
  childFlag?: string;
}

/**
 * Spawn a worker process with piped stdio and persisted logs.
 *
 * Files produced per worker:
 *  - worker-{id}.log       (structured WORKER_LOG written by the child)
 *  - worker-{id}.out.log   (raw stdout)
 *  - worker-{id}.err.log   (raw stderr)
 *  - worker-{id}.info.log  (classified INFO lines from stdout)
 *  - worker-{id}.warn.log  (classified WARN lines from stderr)
 *  - worker-{id}.error.log (classified ERROR lines from stderr)
 *
 * @param opts - Options for spawning the worker process.
 * @returns The spawned ChildProcess instance.
 */
export function spawnWorkerProcess(opts: SpawnWorkerOptions): ChildProcess {
  const {
    id,
    modulePath,
    logDir,
    openLogWindows,
    isSilent,
    childFlag = CHILD_FLAG,
  } = opts;

  const structuredPath = join(logDir, `worker-${id}.log`);
  const outPath = join(logDir, `worker-${id}.out.log`);
  const errPath = join(logDir, `worker-${id}.err.log`);
  const infoPath = join(logDir, `worker-${id}.info.log`);
  const warnPath = join(logDir, `worker-${id}.warn.log`);
  const errorPath = join(logDir, `worker-${id}.error.log`);

  [structuredPath, outPath, errPath, infoPath, warnPath, errorPath].forEach(
    ensureLogFile,
  );

  const child = fork(modulePath, [childFlag], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, WORKER_ID: String(id), WORKER_LOG: structuredPath },
    execArgv: process.execArgv,
    silent: isSilent,
  });

  // Raw capture streams
  const outStream = createWriteStream(outPath, { flags: 'a' });
  const errStream = createWriteStream(errPath, { flags: 'a' });

  // Classified streams
  const infoStream = createWriteStream(infoPath, { flags: 'a' });
  const warnStream = createWriteStream(warnPath, { flags: 'a' });
  const errorStream = createWriteStream(errorPath, { flags: 'a' });

  // Pipe raw streams
  child.stdout?.pipe(outStream);
  child.stderr?.pipe(errStream);

  // Headers so tail windows show something immediately
  const hdr = (name: string): string =>
    `[parent] ${name} capture active for w${id} (pid ${child.pid})\n`;
  outStream.write(hdr('stdout'));
  errStream.write(hdr('stderr'));
  infoStream.write(hdr('info'));
  warnStream.write(hdr('warn'));
  errorStream.write(hdr('error'));

  // Classified INFO from stdout (line-buffered)
  if (child.stdout) {
    const onOutLine = makeLineSplitter((line) => {
      if (!line) return;
      try {
        // Treat all stdout lines as INFO for the classified stream
        infoStream.write(`${line}\n`);
      } catch {
        /* ignore */
      }
    });
    child.stdout.on('data', onOutLine);
  }

  // Classified WARN/ERROR from stderr (line-buffered)
  if (child.stderr) {
    const onErrLine = makeLineSplitter((line) => {
      if (!line) return;
      const lvl = classifyLogLevel(line); // 'warn' | 'error' | null
      try {
        if (lvl === 'error') {
          errorStream.write(`${line}\n`);
        } else {
          // Treat untagged stderr as WARN by default (common in libs)
          warnStream.write(`${line}\n`);
        }
      } catch {
        /* ignore */
      }
    });
    child.stderr.on('data', onErrLine);
  }

  // Stash log path metadata on the child
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (child as any)[LOG_PATHS_SYM] = {
    structuredPath,
    outPath,
    errPath,
    infoPath,
    warnPath,
    errorPath,
  } as WorkerLogPaths;

  if (openLogWindows) {
    openLogTailWindowMulti(
      [structuredPath, outPath, errPath, infoPath, warnPath, errorPath],
      `worker-${id}`,
      isSilent,
    );
  }

  // Best-effort error suppression on file streams
  outStream.on('error', () => {
    /* ignore */
  });
  errStream.on('error', () => {
    /* ignore */
  });
  infoStream.on('error', () => {
    /* ignore */
  });
  warnStream.on('error', () => {
    /* ignore */
  });
  errorStream.on('error', () => {
    /* ignore */
  });

  return child;
}
