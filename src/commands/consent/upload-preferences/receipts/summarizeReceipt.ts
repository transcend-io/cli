import { readFileSync } from 'node:fs';
import type { AnyTotals } from '../ui/buildFrameModel';

/**
 * Summarize a receipts JSON into dashboard counters.
 *
 * @param receiptPath - The path to the receipt file
 * @param dryRun - Whether this is a dry run (no actual upload)
 * @returns An object summarizing the receipt data
 */
export function summarizeReceipt(
  receiptPath: string,
  dryRun: boolean,
): AnyTotals {
  try {
    const raw = readFileSync(receiptPath, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.parse(raw) as any;

    const skippedCount = Object.values(json?.skippedUpdates ?? {}).length;

    if (!dryRun) {
      const success = Object.values(json?.successfulUpdates ?? {}).length;
      const failed = Object.values(json?.failingUpdates ?? {}).length;
      const errors: Record<string, number> = {};
      Object.values(json?.failingUpdates ?? {}).forEach((v) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (v as any)?.error ?? 'Unknown error';
        errors[msg] = (errors[msg] ?? 0) + 1;
      });
      return {
        mode: 'upload',
        success,
        skipped: skippedCount,
        error: failed,
        errors,
      };
    }

    const totalPending = Object.values(json?.pendingUpdates ?? {}).length;
    const pendingConflicts = Object.values(
      json?.pendingConflictUpdates ?? {},
    ).length;
    const pendingSafe = Object.values(json?.pendingSafeUpdates ?? {}).length;

    return {
      mode: 'check',
      totalPending,
      pendingConflicts,
      pendingSafe,
      skipped: skippedCount,
    };
  } catch {
    return !dryRun
      ? { mode: 'upload', success: 0, skipped: 0, error: 0, errors: {} }
      : {
          mode: 'check',
          totalPending: 0,
          pendingConflicts: 0,
          pendingSafe: 0,
          skipped: 0,
        };
  }
}
