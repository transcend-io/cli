import { mkdirSync, writeFileSync } from 'node:fs';
import type { FailingUpdateRow } from '../receipts';

/**
 * Write a CSV file for failing updates.
 *
 * @param folderName - The folder where the CSV file will be written
 * @param rows - The rows to write to the CSV file
 * @param outPath - The output path for the CSV file
 * @returns The absolute path to the written CSV file
 */
export function writeFailingUpdatesCsv(
  folderName: string,
  rows: FailingUpdateRow[],
  outPath: string,
): string {
  mkdirSync(folderName, { recursive: true });
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
