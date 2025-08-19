import type { AnyTotals } from '../../ui';
import { readFailingUpdatesFromReceipt } from './readFailingUpdatesFromReceipt';
import { resolveReceiptPath } from './resolveReceiptPath';
import { summarizeReceipt } from './summarizeReceipt';

/**
 * Applies the summary of a receipt to the overall aggregation.
 *
 * @param opts - Options for applying the receipt summary
 */
export function applyReceiptSummary(opts: {
  /** Folder where receipts are stored */
  receiptsFolder: string;
  /** Path to the file being processed */
  filePath: string;
  /** Path to the receipt file, if different from the default */
  receiptFilepath?: string | null;
  /** Aggregation object to update */
  agg: AnyTotals;
  /** Whether this is a dry run (no actual updates) */
  dryRun: boolean;
  /** Array to collect failing updates from the receipt */
  failingUpdatesMem: Array<unknown>;
}): void {
  const {
    receiptsFolder,
    filePath,
    receiptFilepath,
    agg,
    dryRun,
    failingUpdatesMem,
  } = opts;

  const resolved =
    (typeof receiptFilepath === 'string' && receiptFilepath) ||
    resolveReceiptPath(receiptsFolder, filePath);

  if (!resolved) return;

  const summary = summarizeReceipt(resolved, dryRun);

  // collect failing updates
  failingUpdatesMem.push(...readFailingUpdatesFromReceipt(resolved, filePath));

  // merge totals
  if (summary.mode === 'upload' && agg.mode === 'upload') {
    agg.success += summary.success;
    agg.skipped += summary.skipped;
    agg.error += summary.error;
    Object.entries(summary.errors).forEach(([k, v]) => {
      (agg.errors as Record<string, number>)[k] =
        (agg.errors[k] ?? 0) + (v as number);
    });
  } else if (summary.mode === 'check' && agg.mode === 'check') {
    agg.totalPending += summary.totalPending;
    agg.pendingConflicts += summary.pendingConflicts;
    agg.pendingSafe += summary.pendingSafe;
    agg.skipped += summary.skipped;
  }
}
