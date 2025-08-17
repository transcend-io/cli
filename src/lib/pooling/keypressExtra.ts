import type { ExportManager } from '../../commands/consent/upload-preferences/artifacts';
import type { ExportStatusMap } from './logRotation';
import { showCombinedLogs } from './showCombinedLogs';
import type { SlotPaths } from './spawnWorkerProcess';

/**
 * Handles keypress events for extra functionalities in the CLI.
 *
 * @param args - Configuration for the keypress handler.
 * @returns A function that processes keypress events.
 */
export function makeOnKeypressExtra({
  slotLogPaths,
  exportMgr,
  exportStatus,
  onRepaint,
  onPause,
}: {
  /** Map of worker IDs to their log paths */
  slotLogPaths: SlotPaths;
  /** Export manager for handling export operations */
  exportMgr: ExportManager;
  /** Map of export statuses for different kinds of logs */
  exportStatus: ExportStatusMap;
  /** Callback for repainting the UI */
  onRepaint: () => void;
  /** Callback to pause the UI */
  onPause: (paused: boolean) => void;
}): (buf: Buffer) => void {
  const noteExport = (slot: keyof ExportStatusMap, p: string): void => {
    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current: any = exportStatus[slot] || { path: p };
    // eslint-disable-next-line no-param-reassign
    exportStatus[slot] = {
      path: p || current.path,
      savedAt: now,
      exported: true,
    };
    onRepaint();
  };

  const view = (
    sources: Array<'out' | 'err' | 'structured' | 'warn' | 'info'>,
    level: 'error' | 'warn' | 'all',
  ): void => {
    onPause(true);
    showCombinedLogs(slotLogPaths, sources, level);
  };

  return (buf: Buffer): void => {
    const s = buf.toString('utf8');

    // viewers (lowercase)
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

    // exports (uppercase)
    if (s === 'E') {
      try {
        const p = exportMgr.exportCombinedLogs(slotLogPaths, 'error');
        process.stdout.write(`\nWrote combined error logs to: ${p}\n`);
        noteExport('error', p);
      } catch {
        process.stdout.write('\nFailed to write combined error logs\n');
      }
      return;
    }
    if (s === 'W') {
      try {
        const p = exportMgr.exportCombinedLogs(slotLogPaths, 'warn');
        process.stdout.write(`\nWrote combined warn logs to: ${p}\n`);
        noteExport('warn', p);
      } catch {
        process.stdout.write('\nFailed to write combined warn logs\n');
      }
      return;
    }
    if (s === 'I') {
      try {
        const p = exportMgr.exportCombinedLogs(slotLogPaths, 'info');
        process.stdout.write(`\nWrote combined info logs to: ${p}\n`);
        noteExport('info', p);
      } catch {
        process.stdout.write('\nFailed to write combined info logs\n');
      }
      return;
    }
    if (s === 'A') {
      try {
        const p = exportMgr.exportCombinedLogs(slotLogPaths, 'all');
        process.stdout.write(`\nWrote combined ALL logs to: ${p}\n`);
        noteExport('all', p);
      } catch {
        process.stdout.write('\nFailed to write combined ALL logs\n');
      }
      return;
    }

    // back to dashboard
    if (s === '\x1b' || s === '\x1d') {
      onPause(false);
      onRepaint();
    }
  };
}
