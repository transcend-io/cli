import * as readline from 'node:readline';
import { buildFrameModel, type RenderDashboardInput } from './buildFrameModel';

let lastFrame = '';

/**
 * Render a flicker-free, text-based dashboard in the terminal (TTY)
 * for monitoring CSV chunking workers.
 *
 * This function is designed to continuously refresh the screen in place,
 * showing:
 *   - Overall progress (completed/failed/total files)
 *   - Pool and CPU metrics
 *   - Recent throughput rates
 *   - Each worker’s state (busy/idle, warning/error state, progress, file path)
 *
 * It achieves flicker-free rendering by:
 *   1. Caching the last rendered frame (`lastFrame`) and only redrawing if
 *      something has changed.
 *   2. Using ANSI escape sequences + `readline` helpers to overwrite the
 *      existing terminal content rather than printing new lines.
 *   3. Hiding the cursor while active updates are happening, then restoring it
 *      when rendering the final frame.
 *
 * @param input - The current state of the pool, worker map, throughput, etc.
 *   Typically produced on each heartbeat/interval by the main process.
 */
export function renderDashboard(input: RenderDashboardInput): void {
  // Normalize the current state into a simple model shape.
  const m = buildFrameModel(input);

  // Build the header line summarizing pool and throughput statistics.
  const head =
    `Chunk CSV — ${m.filesCompleted}/${m.filesTotal} done, failed ${m.filesFailed}\n` +
    `Pool ${m.poolSize} • CPU ${m.cpuCount} • r10s ${m.throughput.r10s.toFixed(
      1,
    )} r60s ${m.throughput.r60s.toFixed(1)}`;

  // Build per-worker status rows, including:
  // - worker ID
  // - BUSY/IDLE state
  // - optional WARN/ERROR tag
  // - processed row count
  // - file currently assigned (if any)
  const rows = m.workers
    .map((w) => {
      const status = w.busy ? 'BUSY' : 'IDLE';
      const lvl =
        w.level === 'ok' ? '' : w.level === 'warn' ? ' [WARN]' : ' [ERROR]';
      const prog = w.processed
        ? `rows=${w.processed.toLocaleString()}`
        : 'rows=0';
      const file = w.file ? ` — ${w.file}` : '';
      return `w${w.id
        .toString()
        .padStart(2, '0')}: ${status}${lvl} ${prog}${file}`;
    })
    .join('\n');

  // Assemble the full frame string for this render cycle.
  const frame = `${head}\n\n${rows}\n`;

  // Optimization: avoid redrawing if nothing has changed and we’re not final.
  if (!input.final && frame === lastFrame) return;
  lastFrame = frame;

  if (!input.final) {
    // Live updates:
    //   - Hide the cursor for aesthetics
    //   - Reset cursor to top-left
    //   - Clear the screen before redrawing
    process.stdout.write('\x1b[?25l');
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  } else {
    // Final frame: restore the cursor so the user can interact normally again.
    process.stdout.write('\x1b[?25h');
  }

  // Write the frame (always with a trailing newline for separation).
  process.stdout.write(`${frame}\n`);
}
