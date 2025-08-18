import * as readline from 'node:readline';
import type { ChildProcess } from 'node:child_process';
import type { WorkerLogPaths } from './spawnWorkerProcess';
import { replayFileTailToStdout } from './replayFileTailToStdout';
import { keymap } from './keymap';
import { cycleWorkers, getWorkerIds } from './workerIds';
import type { WhichLogs } from './showCombinedLogs';
import { DEBUG } from '../../constants';

/**
 * Key action types for the interactive switcher
 */
export type InteractiveDashboardMode = 'dashboard' | 'attached';

export interface SwitcherPorts {
  /** Standard input stream */
  stdin: NodeJS.ReadStream;
  /** Standard output stream */
  stdout: NodeJS.WriteStream;
  /** Standard error stream */
  stderr: NodeJS.WriteStream;
}

/**
 * Install an interactive switcher for managing worker processes.
 *
 * @param opts - Options for the switcher
 * @returns A cleanup function to remove the switcher
 */
export function installInteractiveSwitcher(opts: {
  /** Registry of live workers by id */
  workers: Map<number, ChildProcess>;
  /** Hooks */
  onAttach?: (id: number) => void;
  /** Optional detach handler */
  onDetach?: () => void;
  /** Optional Ctrl+C handler for parent graceful shutdown in dashboard */
  onCtrlC?: () => void; // parent graceful shutdown in dashboard
  /** Provide log paths so we can replay the tail on attach */
  getLogPaths?: (id: number) => WorkerLogPaths | undefined;
  /** How many bytes to replay from the end of each file (default 200 KB) */
  replayBytes?: number;
  /** Which logs to replay first (default ['out','err']) */
  replayWhich?: WhichLogs;
  /** Print a small banner/clear screen before replaying (optional) */
  onEnterAttachScreen?: (id: number) => void;
  /** Optional stdio ports for testing; defaults to process stdio */
  ports?: SwitcherPorts;
}): () => void {
  const {
    workers,
    onAttach,
    onDetach,
    onCtrlC,
    getLogPaths,
    replayBytes = 200 * 1024,
    replayWhich = ['out', 'err'],
    onEnterAttachScreen,
    ports,
  } = opts;

  const stdin = ports?.stdin ?? process.stdin;
  const stdout = ports?.stdout ?? process.stdout;
  const stderr = ports?.stderr ?? process.stderr;

  const d = (...a: unknown[]): void => {
    if (DEBUG) {
      try {
        (ports?.stderr ?? process.stderr).write(
          `[keys] ${a.map(String).join(' ')}\n`,
        );
      } catch {
        // noop
      }
    }
  };

  if (!stdin.isTTY) {
    // Not a TTY; return a no-op cleanup
    return () => {
      // noop
    };
  }

  readline.emitKeypressEvents(stdin);
  stdin.setRawMode?.(true);

  let mode: InteractiveDashboardMode = 'dashboard';
  let focus: number | null = null;

  // live mirroring handlers while attached
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let outHandler: ((chunk: any) => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errHandler: ((chunk: any) => void) | null = null;

  /**
   * Cycle through worker IDs, wrapping around.
   *
   * @param id - The current worker ID to start cycling from.
   * @returns The next worker ID after cycling, or null if no workers are available.
   */
  async function replayLogs(id: number): Promise<void> {
    if (!getLogPaths) return;
    const paths = getLogPaths(id);
    if (!paths) return;

    const toReplay: string[] = [];
    for (const which of replayWhich) {
      if (which === 'out') toReplay.push(paths.outPath);
      if (which === 'err') toReplay.push(paths.errPath);
      if (which === 'structured') toReplay.push(paths.structuredPath);
    }

    if (toReplay.length) {
      stdout.write('\n------------ replay ------------\n');
      for (const p of toReplay) {
        stdout.write(
          `\n--- ${p} (last ~${Math.floor(replayBytes / 1024)}KB) ---\n`,
        );
        await replayFileTailToStdout(p, replayBytes, (s) => stdout.write(s));
      }
      stdout.write('\n--------------------------------\n\n');
    }
  }

  const attach = async (id: number): Promise<void> => {
    d('attach()', `id=${id}`); // at function entry

    const w = workers.get(id);
    if (!w) return;

    // Detach any previous focus
    if (mode === 'attached') detach();

    mode = 'attached';
    focus = id;

    // UX: clear + banner
    onEnterAttachScreen?.(id);

    onAttach?.(id); // prints “Attached to worker …” and clears
    await replayLogs(id); // now the tail stays visible

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outHandler = (chunk: any) => stdout.write(chunk);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errHandler = (chunk: any) => stderr.write(chunk);
    w.stdout?.on('data', outHandler);
    w.stderr?.on('data', errHandler);

    // auto-detach if child exits
    const onExit = (): void => {
      if (focus === id) detach();
    };
    w.once('exit', onExit);
  };

  const detach = (): void => {
    d('detach()', `id=${focus}`); // at function entry

    if (focus == null) return;
    const id = focus;
    const w = workers.get(id);
    if (w) {
      if (outHandler) w.stdout?.off('data', outHandler);
      if (errHandler) w.stderr?.off('data', errHandler);
    }
    outHandler = null;
    errHandler = null;
    focus = null;
    mode = 'dashboard';
    onDetach?.();
  };

  const onKey = (str: string, key: readline.Key): void => {
    d(
      'keypress',
      JSON.stringify({
        str,
        name: key.name,
        seq: key.sequence,
        ctrl: key.ctrl,
        meta: key.meta,
        shift: key.shift,
        mode,
      }),
    );
    const act = keymap(str, key, mode);
    d('mapped', JSON.stringify(act));

    if (!act) return;

    // eslint-disable-next-line default-case
    switch (act.type) {
      case 'CTRL_C': {
        d('CTRL_C');
        if (mode === 'attached' && focus != null) {
          const w = workers.get(focus);
          try {
            w?.kill('SIGINT');
          } catch {
            // noop
          }
          // optional: auto-detach so second Ctrl+C exits parent
          detach();
          return;
        }
        onCtrlC?.();
        return;
      }

      case 'ATTACH': {
        d('ATTACH', `id=${act.id}`, `has=${workers.has(act.id)}`);

        if (mode !== 'dashboard') return;
        // eslint-disable-next-line no-void
        if (workers.has(act.id)) void attach(act.id);
        return;
      }

      case 'CYCLE': {
        d('CYCLE', `delta=${act.delta}`);
        if (mode !== 'dashboard') return;
        const next = cycleWorkers(getWorkerIds(workers), focus, act.delta);
        // eslint-disable-next-line no-void
        if (next != null) void attach(next);
        return;
      }

      case 'QUIT': {
        if (mode !== 'dashboard') return;
        onCtrlC?.();
        return;
      }

      case 'DETACH': {
        d('DETACH');
        if (mode === 'attached') detach();
        return;
      }

      case 'CTRL_D': {
        if (mode === 'attached' && focus != null) {
          const w = workers.get(focus);
          try {
            w?.stdin?.end();
          } catch {
            // noop
          }
        }
        return;
      }

      case 'FORWARD': {
        if (mode === 'attached' && focus != null) {
          const w = workers.get(focus);
          try {
            w?.stdin?.write(act.sequence);
          } catch {
            // noop
          }
        }
      }
    }
  };

  // Raw bytes fallback (usually not hit because keypress handles it)
  const onData = (chunk: Buffer): void => {
    if (mode === 'attached' && focus != null) {
      const w = workers.get(focus);
      try {
        w?.stdin?.write(chunk);
      } catch {
        // noop
      }
    }
  };

  const cleanup = (): void => {
    stdin.off('keypress', onKey);
    stdin.off('data', onData);
    stdin.setRawMode?.(false);
    stdout.write('\x1b[?25h');
  };

  stdin.on('keypress', onKey);
  stdin.on('data', onData);

  return cleanup;
}
