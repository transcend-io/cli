// lib/ui/dashboardPlugin.ts
import * as readline from 'node:readline';
import colors from 'colors';
import type { SlotState } from './types';
import type { ObjByString } from '@transcend-io/type-utils';

/**
 * A dashboard plugin defines how to render the worker pool UI.
 * Commands can supply a plugin to customize:
 *   - The header block (summary stats, title, etc.)
 *   - Per-worker rows (one line per worker slot)
 *   - Optional extras (artifact exports, breakdowns, footers)
 *
 * @template TTotals - The shape of the aggregate totals object maintained by the command.
 */
export interface DashboardPlugin<TTotals, TSlotState extends ObjByString> {
  /**
   * Render the header block of the dashboard.
   *
   * @param ctx - Context with pool/worker state, totals, and metadata.
   * @returns An array of strings, each representing one line in the header.
   */
  renderHeader: (ctx: CommonCtx<TTotals, TSlotState>) => string[];

  /**
   * Render per-worker rows, usually one line per worker slot.
   *
   * @param ctx - Context with pool/worker state, totals, and metadata.
   * @returns An array of strings, each representing one row in the workers section.
   */
  renderWorkers: (ctx: CommonCtx<TTotals, TSlotState>) => string[];

  /**
   * Render any optional extra blocks that appear after the worker rows.
   * Useful for printing export paths, aggregated metrics, breakdowns, etc.
   *
   * @param ctx - Context with pool/worker state, totals, and metadata.
   * @returns An array of strings, each representing one additional line.
   */
  renderExtras?: (ctx: CommonCtx<TTotals, TSlotState>) => string[];
}

/**
 * Shared context object passed into all render methods of a {@link DashboardPlugin}.
 *
 * @template TTotals - The shape of the aggregate totals object maintained by the command.
 */
export type CommonCtx<TTotals, TSlotState extends ObjByString> = {
  /** Human-readable title for the dashboard (e.g., "Parallel uploader"). */
  title: string;

  /** Number of worker processes spawned in the pool. */
  poolSize: number;

  /** Logical CPU count, included for informational display. */
  cpuCount: number;

  /** Total number of "files" or logical units the command expects to process. */
  filesTotal: number;

  /** Count of successfully completed files/tasks. */
  filesCompleted: number;

  /** Count of failed files/tasks. */
  filesFailed: number;

  /**
   * State of each worker slot, keyed by worker id.
   * Includes busy flag, file label, start time, last log badge, and progress.
   */
  workerState: Map<number, SlotState<TSlotState>>;

  /**
   * Aggregate totals maintained by the command’s hook logic.
   * Domain-specific metrics (e.g., rows uploaded, bytes processed) can be surfaced here.
   */
  totals: TTotals;

  /**
   * Throughput metrics tracked by the runner:
   * - successSoFar: convenience alias for completed count
   * - r10s: completions/sec averaged over last 10s
   * - r60s: completions/sec averaged over last 60s
   */
  throughput: {
    /** Cumulative count of successful completions so far. */
    successSoFar: number;
    /** Recent throughput rate over the last 10 seconds. */
    r10s: number;
    /** Recent throughput rate over the last 60 seconds. */
    r60s: number;
  };

  /** True when the pool has fully drained and all workers have exited. */
  final: boolean;

  /**
   * Optional export status payload provided by the command.
   * Useful for rendering artifact paths or "latest export" summaries.
   */
  exportStatus?: Record<string, unknown>;
};

/** The most recently rendered frame, cached to suppress flicker from duplicate renders. */
let lastFrame = '';

/**
 * Generate the hotkeys hint string that appears at the bottom of the dashboard.
 *
 * @param poolSize - The number of worker slots in the pool.
 * @param final - Whether the run has completed.
 * @returns A dimmed string listing the supported hotkeys for attach/detach/quit.
 */
export const hotkeysHint = (poolSize: number, final: boolean): string => {
  const maxDigit = Math.min(poolSize - 1, 9);
  const digitRange = poolSize <= 1 ? '0' : `0-${maxDigit}`;
  const extra = poolSize > 10 ? ' (Tab/Shift+Tab for ≥10)' : '';
  return final
    ? colors.dim(
        'Run complete — digits to view logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • q to quit',
      )
    : colors.dim(
        `Hotkeys: [${digitRange}] attach${extra} • e=errors • w=warnings • i=info • l=logs • ` +
          'Tab/Shift+Tab • Esc/Ctrl+] detach • Ctrl+C exit',
      );
};

/**
 * Render the dashboard using a supplied {@link DashboardPlugin}.
 *
 * The frame is composed of:
 *   - Header lines
 *   - A blank separator
 *   - Worker rows
 *   - A blank separator
 *   - Hotkeys hint
 *   - Optional extras (if plugin supplies them)
 *
 * Optimizations:
 *   - Suppresses re-renders if the frame is identical to the previous frame (flicker-free).
 *   - Hides the terminal cursor during live updates, restoring it when final.
 *
 * @param ctx - Shared context containing pool state, worker state, totals, throughput, etc.
 * @param plugin - The plugin that defines how to render the header, workers, and optional extras.
 */
export function dashboardPlugin<TTotals, TSlotState extends ObjByString>(
  ctx: CommonCtx<TTotals, TSlotState>,
  plugin: DashboardPlugin<TTotals, TSlotState>,
): void {
  const frame = [
    ...plugin.renderHeader(ctx),
    '',
    ...plugin.renderWorkers(ctx),
    '',
    hotkeysHint(ctx.poolSize, ctx.final),
    ...(plugin.renderExtras ? [''].concat(plugin.renderExtras(ctx)) : []),
  ].join('\n');

  // Skip duplicate renders during live runs to avoid flicker.
  if (!ctx.final && frame === lastFrame) return;
  lastFrame = frame;

  if (!ctx.final) {
    // Hide cursor and repaint in place
    process.stdout.write('\x1b[?25l');
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  } else {
    // Restore cursor on final render
    process.stdout.write('\x1b[?25h');
  }
  process.stdout.write(`${frame}\n`);
}
