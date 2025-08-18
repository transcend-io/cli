import * as readline from 'node:readline';
import { buildFrameModel, type RenderDashboardInput } from './buildFrameModel';

let lastFrame = '';
let frameTick = 0;

/** Simple unicode spinner for BUSY workers when total is unknown. */
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Left/right caps for bars; use ASCII if you prefer. */
const BAR_LEFT = '│';
const BAR_RIGHT = '│';
const BAR_FULL = '█';
const BAR_EMPTY = '░';

/**
 * Render a flicker-free, text-based dashboard in the terminal (TTY)
 * for monitoring CSV chunking workers.
 *
 * What you see:
 *  - Overall progress (completed / failed / total)
 *  - Pool/CPU metrics
 *  - Recent throughput (r10s / r60s)
 *  - Each worker: BUSY/IDLE (+WARN/ERROR), rows processed, file path
 *  - A progress bar per worker (if total known), or a spinner if total unknown
 *
 * Hotkeys (handled by the interactive switcher):
 *   0–9 attach • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+D EOF • Ctrl+C quit
 *
 * @param input - Input object containing state and metrics to render
 */
export function renderDashboard(input: RenderDashboardInput): void {
  frameTick = (frameTick + 1) % SPIN.length;
  const m = buildFrameModel(input);

  // header
  const head =
    `Chunk CSV — ${m.filesCompleted}/${m.filesTotal} done, failed ${m.filesFailed}\n` +
    `Pool ${m.poolSize} • CPU ${m.cpuCount} • r10s ${m.throughput.r10s.toFixed(
      1,
    )} ` +
    `r60s ${m.throughput.r60s.toFixed(1)}\n` +
    '(hotkeys: 0–9 attach • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+D EOF • Ctrl+C quit)';

  // per-worker line with progress bar / spinner
  const rows = m.workers
    .map((w) => {
      const status = w.busy ? 'BUSY' : 'IDLE';
      const lvl =
        w.level === 'ok' ? '' : w.level === 'warn' ? ' [WARN]' : ' [ERROR]';

      const processed = w.processed ?? 0;
      const total = w.total ?? undefined;

      let progressVisual = '';
      if (w.busy && typeof total === 'number' && total > 0) {
        const pct = Math.max(0, Math.min(1, processed / total));
        const width = 28; // bar width
        const filled = Math.round(pct * width);
        const empty = width - filled;
        progressVisual = `${BAR_LEFT}${BAR_FULL.repeat(
          filled,
        )}${BAR_EMPTY.repeat(empty)}${BAR_RIGHT} (${Math.floor(pct * 100)}%)`;
      } else if (w.busy) {
        progressVisual = `${SPIN[frameTick]} processing`;
      } else {
        progressVisual = '—';
      }

      const prog = `rows=${processed.toLocaleString()} ${progressVisual}`;
      const file = w.file ? ` — ${w.file}` : '';

      return `w${w.id
        .toString()
        .padStart(2, '0')}: ${status}${lvl}  ${prog}${file}`;
    })
    .join('\n');

  const frame = `${head}\n\n${rows}\n`;

  if (!input.final && frame === lastFrame) return;
  lastFrame = frame;

  if (!input.final) {
    process.stdout.write('\x1b[?25l');
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  } else {
    process.stdout.write('\x1b[?25h');
  }
  process.stdout.write(`${frame}\n`);
}
