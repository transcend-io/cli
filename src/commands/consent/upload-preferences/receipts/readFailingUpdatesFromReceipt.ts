import { readFileSync } from 'node:fs';
import type { FailingUpdateRow } from '../artifacts';

/**
 * Parse failing updates out of a receipts.json file.
 * Returns rows you can merge into your in-memory buffer.
 *
 * @param receiptPath - The path to the receipts.json file
 * @param sourceFile - Optional source file for context
 * @returns An array of FailingUpdateRow objects
 */
export function readFailingUpdatesFromReceipt(
  receiptPath: string,
  sourceFile?: string,
): FailingUpdateRow[] {
  try {
    const raw = readFileSync(receiptPath, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.parse(raw) as any;
    const failing = json?.failingUpdates ?? {};
    const out: FailingUpdateRow[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [primaryKey, val] of Object.entries<any>(failing)) {
      out.push({
        primaryKey,
        uploadedAt: val?.uploadedAt ?? '',
        error: val?.error ?? '',
        updateJson: val?.update ? JSON.stringify(val.update) : '',
        sourceFile,
      });
    }
    return out;
  } catch {
    return [];
  }
}
