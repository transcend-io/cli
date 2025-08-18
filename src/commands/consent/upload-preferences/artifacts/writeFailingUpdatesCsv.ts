import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

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
 * Write a CSV file for failing updates.
 *
 * @param rows - The rows to write to the CSV file
 * @param outPath - The output path for the CSV file
 * @returns The absolute path to the written CSV file
 */
export function writeFailingUpdatesCsv(
  rows: FailingUpdateRow[],
  outPath: string,
): string {
  mkdirSync(dirname(outPath), { recursive: true });
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row || {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const esc = (v: unknown): string => {
    if (v == null) return '';
    const s =
      typeof v === 'string'
        ? v
        : typeof v === 'object'
        ? JSON.stringify(v)
        : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(',')),
  ];
  writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  return outPath;
}
