/**
 * Shared handler for "extra" keyboard shortcuts used by the interactive dashboard.
 *
 * It wires:
 * - **Viewers (lowercase):** `e` (errors), `w` (warnings), `i` (info), `l` (all)
 * - **Exports (uppercase, optional):** `E` (errors), `W` (warnings), `I` (info), `A` (all)
 * - **Dismiss:** `Esc` or `Ctrl+]` exits a viewer and returns to the dashboard
 * - **Custom keys (optional):** Provide a `custom` map to handle command-specific bindings
 *
 * Usage (inside `runPool({... extraKeyHandler })`):
 * ```ts
 * extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
 *   createExtraKeyHandler({ logsBySlot, repaint, setPaused })
 * ```
 *
 * If you also want export hotkeys + an "Exports" panel:
 * ```ts
 * extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
 *   createExtraKeyHandler({
 *     logsBySlot, repaint, setPaused,
 *     exportMgr,         // enables E/W/I/A
 *     exportStatus,      // keeps panel timestamps up to date
 *     custom: {          // optional, e.g. 'F' to export a CSV
 *       F: async ({ say, noteExport }) => { ... }
 *     }
 *   })
 * ```
 */

import type { ExportStatusMap } from './logRotation';
import { showCombinedLogs, type LogLocation } from './showCombinedLogs';
import type { SlotPaths } from './spawnWorkerProcess';

/** Severity filter applied by the viewer. */
type ViewLevel = 'error' | 'warn' | 'all';

/**
 * Options for {@link createExtraKeyHandler}.
 */
export type CreateExtraKeyHandlerOpts = {
  /**
   * Per-slot log file paths maintained by the runner; used to stream or export logs.
   */
  logsBySlot: SlotPaths;

  /**
   * Request an immediate dashboard repaint (e.g., after updating export status).
   */
  repaint: () => void;

  /**
   * Pause/unpause dashboard repainting. The handler pauses while a viewer is open
   * to prevent the dashboard from overwriting the viewer output, then resumes on exit.
   */
  setPaused: (p: boolean) => void;

  /**
   * Optional export manager to enable uppercase export keys:
   * - `E` (errors) • `W` (warnings) • `I` (info) • `A` (all)
   *
   * Provide this only if your command supports writing combined log files.
   */
  exportMgr?: {
    /** Destination directory for exported artifacts. */
    exportsDir: string;
    /**
     * Write a combined log file for the selected severity and return the absolute path.
     *
     * @param logs - Log paths to combine.
     * @param which - Severity selection.
     * @returns Absolute path to the written file.
     */
    exportCombinedLogs: (
      logs: SlotPaths,
      which: 'error' | 'warn' | 'info' | 'all',
    ) => string;
  };

  /**
   * Optional “Exports” status map. If provided, the handler updates timestamps
   * when exports are written so your dashboard panel can reflect “last saved” times.
   */
  exportStatus?: ExportStatusMap;

  /**
   * Optional custom key bindings for command-specific actions.
   * Each handler receives helpers to print messages and to update the exports panel.
   *
   * Example:
   * ```ts
   * custom: {
   *   F: async ({ say, noteExport }) => {
   *     const p = await writeFailingUpdatesCsv(...);
   *     say(`Wrote failing updates to: ${p}`);
   *     noteExport('failuresCsv', p);
   *   }
   * }
   * ```
   */
  custom?: Record<
    string,
    (ctx: {
      /** Update {@link exportStatus} (if present) and repaint the dashboard. */
      noteExport: (slot: keyof ExportStatusMap, absPath: string) => void;
      /** Print a line to stdout, automatically newline-terminated. */
      say: (s: string) => void;
    }) => void | Promise<void>
  >;
};

/**
 * Create a keypress handler for interactive viewers/exports.
 *
 * @param opts - Configuration for viewers, exports, and custom keys.
 * @returns A `(buf: Buffer) => void` handler suitable for `process.stdin.on('data', ...)`.
 */
export function createExtraKeyHandler(
  opts: CreateExtraKeyHandlerOpts,
): (buf: Buffer) => void {
  const { logsBySlot, repaint, setPaused, exportMgr, exportStatus, custom } =
    opts;

  const say = (s: string): void => {
    process.stdout.write(`${s}\n`);
  };

  /**
   * Record that an export was written and trigger a repaint so the dashboard’s
   * "Exports" panel shows the updated timestamp/path.
   *
   * @param slot - Slot name in {@link ExportStatusMap} (e.g., "error", "warn", etc.).
   * @param p - Absolute path to the exported file.
   */
  const noteExport = (slot: keyof ExportStatusMap, p: string): void => {
    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cur: any = exportStatus?.[slot] ?? { path: p };
    if (exportStatus) {
      exportStatus[slot] = {
        path: p || cur.path,
        savedAt: now,
        exported: true,
      };
      repaint();
    }
  };

  /**
   * Show an inline combined log viewer for the selected sources/level.
   * Pauses dashboard repaint to keep the viewer visible until the user exits.
   *
   * @param sources - Log sources to include (e.g., "err", "warn", "info").
   * @param level - Severity level to filter by (e.g., "error", "warn", "all").
   */
  const view = async (
    sources: LogLocation[],
    level: ViewLevel,
  ): Promise<void> => {
    setPaused(true);
    try {
      await showCombinedLogs(logsBySlot, sources, level);
    } finally {
      setPaused(false);
      repaint();
    }
  };

  /**
   * Export combined logs (if an export manager was provided).
   *
   * @param which - Severity to export (e.g., "error", "warn", "info", "all").
   * @param label - Human-readable label for the export (e.g., "error", "warn").
   */
  const exportCombined = (
    which: 'error' | 'warn' | 'info' | 'all',
    label: string,
  ): void => {
    if (!exportMgr) return;
    try {
      const p = exportMgr.exportCombinedLogs(logsBySlot, which);
      say(`\nWrote combined ${label} logs to: ${p}`);
      noteExport(which as keyof ExportStatusMap, p);
    } catch {
      say(`\nFailed to write combined ${label} logs`);
    }
  };

  // The keypress handler the runner will attach to stdin.
  return (buf: Buffer): void => {
    const s = buf.toString('utf8');

    // Viewers (lowercase)
    if (s === 'e') {
      view(['err'], 'error');
      return;
    }
    if (s === 'w') {
      view(['warn', 'err'], 'warn');
      return;
    }
    if (s === 'i') {
      view(['info'], 'all');
      return;
    }
    if (s === 'l') {
      view(['out', 'err', 'structured'], 'all');
      return;
    }

    // Exports (uppercase) — enabled only when exportMgr is present
    if (s === 'E') {
      exportCombined('error', 'error');
      return;
    }
    if (s === 'W') {
      exportCombined('warn', 'warn');
      return;
    }
    if (s === 'I') {
      exportCombined('info', 'info');
      return;
    }
    if (s === 'A') {
      exportCombined('all', 'ALL');
      return;
    }

    // Command-specific bindings
    const fn = custom?.[s];
    if (fn) {
      fn({ noteExport, say });
      return;
    }

    // Exit a viewer (Esc / Ctrl+]) — resume dashboard
    if (s === '\x1b' || s === '\x1d') {
      setPaused(false);
      repaint();
    }
  };
}
