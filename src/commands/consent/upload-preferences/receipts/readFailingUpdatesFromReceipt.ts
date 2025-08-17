import { readFileSync } from 'node:fs';

/** A single failing update row we will output to CSV */
export interface FailingUpdateRow {
  /** The primary key / userId from receipts map key */
  primaryKey: string;
  /** When the upload attempt happened (ISO string) */
  uploadedAt: string;
  /** Error message */
  error: string;
  /** JSON-encoded "update" body (compact) */
  updateJson: string;
  /** Optional source file the row came from (helps triage) */
  sourceFile?: string;
}

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
