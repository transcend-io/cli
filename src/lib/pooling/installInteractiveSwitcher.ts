// interactiveSwitcher.ts
import * as readline from 'node:readline';
import { createReadStream, statSync } from 'node:fs';
import type { ChildProcess } from 'node:child_process';
import type { WorkerLogPaths } from './spawnWorkerProcess';

/**
 *
 */
export type WhichLogs = Array<'out' | 'err' | 'structured'>;

/**
 *
 * @param opts
 */
export function installInteractiveSwitcher(opts: {
  /** */
  workers: Map<number, ChildProcess>;
  /** */
  onAttach?: (id: number) => void;
  /** */
  onDetach?: () => void;
  /** */
  onCtrlC?: () => void; // parent graceful shutdown in dashboard
  /** Provide log paths so we can replay the tail on attach */
  getLogPaths?: (id: number) => WorkerLogPaths | undefined;
  /** How many bytes to replay from the end of each file (default 200 KB) */
  replayBytes?: number;
  /** Which logs to replay first (default ['out','err']) */
  replayWhich?: WhichLogs;
  /** Print a small banner/clear screen before replaying (optional) */
  onEnterAttachScreen?: (id: number) => void;
}) {
  const {
    workers,
    onAttach,
    onDetach,
    onCtrlC,
    getLogPaths,
    replayBytes = 200 * 1024,
    replayWhich = ['out', 'err'],
    onEnterAttachScreen,
  } = opts;

  const { stdin } = process;
  if (!stdin.isTTY) return () => {};

  readline.emitKeypressEvents(stdin);
  stdin.setRawMode?.(true);

  let mode: 'dashboard' | 'attached' = 'dashboard';
  let focus: number | null = null;

  // live mirroring handlers while attached
  let outHandler: ((chunk: any) => void) | null = null;
  let errHandler: ((chunk: any) => void) | null = null;

  const workerIds = () => [...workers.keys()].sort((a, b) => a - b);
  const idxOf = (id: number) => workerIds().indexOf(id);

  /**
   *
   * @param path
   * @param maxBytes
   */
  function replayFileTailToStdout(
    path: string,
    maxBytes: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      try {
        const st = statSync(path);
        const start = Math.max(0, st.size - maxBytes);
        const stream = createReadStream(path, { start, encoding: 'utf8' });
        stream.on('data', (chunk) => process.stdout.write(chunk));
        stream.on('end', () => resolve());
        stream.on('error', () => resolve());
      } catch {
        resolve();
      }
    });
  }

  /**
   *
   * @param id
   */
  async function replayLogs(id: number) {
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
      process.stdout.write(`\n${'-'.repeat(12)} replay ${'-'.repeat(12)}\n`);
      for (const p of toReplay) {
        // small header for context
        process.stdout.write(
          `\n--- ${p} (last ~${Math.floor(replayBytes / 1024)}KB) ---\n`,
        );

        await replayFileTailToStdout(p, replayBytes);
      }
      process.stdout.write(`\n${'-'.repeat(32)}\n\n`);
    }
  }

  const attach = async (id: number) => {
    const w = workers.get(id);
    if (!w) return;

    // Detach any previous focus
    if (mode === 'attached') detach();

    mode = 'attached';
    focus = id;

    // UX: clear + banner
    onEnterAttachScreen?.(id);

    // 1) replay last bytes from logs so you see history
    await replayLogs(id);

    // 2) now mirror live child output to our terminal
    onAttach?.(id);
    outHandler = (chunk: any) => process.stdout.write(chunk);
    errHandler = (chunk: any) => process.stderr.write(chunk);
    w.stdout?.on('data', outHandler);
    w.stderr?.on('data', errHandler);

    // auto-detach if child exits
    const onExit = () => {
      if (focus === id) detach();
    };
    w.once('exit', onExit);
  };

  const detach = () => {
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

  const cycle = (delta: number) => {
    const ids = workerIds();
    if (ids.length === 0) return;
    const current = focus == null ? ids[0] : focus;
    let i = idxOf(current);
    if (i === -1) i = 0;
    i = (i + delta + ids.length) % ids.length;
    void attach(ids[i]);
  };

  const onKey = (str: string, key: readline.Key) => {
    if (!key) return;

    // Ctrl+C behavior
    if (key.ctrl && key.name === 'c') {
      if (mode === 'attached' && focus != null) {
        const w = workers.get(focus);
        try {
          w?.kill('SIGINT');
        } catch {}
        // optional: auto-detach so second Ctrl+C exits parent
        detach();
        return;
      }
      onCtrlC?.();
      return;
    }

    if (mode === 'dashboard') {
      if (key.name && /^[0-9]$/.test(key.name)) {
        const n = Number(key.name);
        if (workers.has(n)) void attach(n);
        return;
      }
      if (key.name === 'tab' && !key.shift) {
        cycle(+1);
        return;
      }
      if (key.name === 'tab' && key.shift) {
        cycle(-1);
        return;
      }
      if (key.name === 'q') {
        onCtrlC?.();
        return;
      }
      return;
    }

    // attached mode
    if (key.name === 'escape' || (key.ctrl && key.name === ']')) {
      detach();
      return;
    }
    if (key.ctrl && key.name === 'd') {
      const w = focus != null ? workers.get(focus) : null;
      try {
        w?.stdin?.end();
      } catch {}
      return;
    }

    // forward keystrokes to child
    const w = focus != null ? workers.get(focus) : null;
    if (!w || !w.stdin) return;
    const seq = (key as any).sequence ?? str ?? '';
    if (seq) {
      try {
        w.stdin.write(seq);
      } catch {}
    }
  };

  // Raw bytes fallback (usually not hit because keypress handles it)
  const onData = (chunk: Buffer) => {
    if (mode === 'attached' && focus != null) {
      const w = workers.get(focus);
      try {
        w?.stdin?.write(chunk);
      } catch {}
    }
  };

  const cleanup = () => {
    stdin.off('keypress', onKey);
    stdin.off('data', onData);
    stdin.setRawMode?.(false);
    process.stdout.write('\x1b[?25h');
  };

  stdin.on('keypress', onKey);
  stdin.on('data', onData);

  return cleanup;
}
