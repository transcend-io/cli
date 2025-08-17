// lib/pooling/downloadArtifacts.ts
import {
  createReadStream,
  createWriteStream,
  statSync,
  readFileSync,
} from 'node:fs';
import { join, basename } from 'node:path';
import { once } from 'node:events';
import type { getWorkerLogPaths } from './spawnWorkerProcess';

/**
 *
 */
export type LogKind = 'error' | 'warn' | 'info';

/**
 *
 */
type SlotPaths = Map<number, ReturnType<typeof getWorkerLogPaths> | undefined>;

/**
 * Combine all worker logs of the given kind into a single file.
 * Writes simple headers per worker and concatenates in worker-id order.
 *
 * @param slotLogPaths - Map of workerId -> WorkerLogPaths
 * @param kind - 'error' | 'warn' | 'info'
 * @param outDir - directory to write the combined file
 * @param filename - optional override (default: combined-{kind}.log)
 * @returns absolute path to the combined log file
 */
export async function exportCombinedLogs(
  slotLogPaths: SlotPaths,
  kind: LogKind,
  outDir: string,
  filename?: string,
): Promise<string> {
  const outPath = join(outDir, filename ?? `combined-${kind}.log`);
  const out = createWriteStream(outPath, { flags: 'w' });

  const pick = (p: NonNullable<ReturnType<typeof getWorkerLogPaths>>) =>
    kind === 'error' ? p.errorPath : kind === 'warn' ? p.warnPath : p.infoPath;

  for (const [id, paths] of [...slotLogPaths.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    if (!paths) continue;
    const srcPath = pick(paths);
    try {
      // header for context
      out.write(`\n==== worker ${id} (${basename(srcPath)}) ====\n`);
      const st = statSync(srcPath);
      if (st.size === 0) {
        out.write('[empty]\n');
        continue;
      }
      const rs = createReadStream(srcPath, { encoding: 'utf8' });
      rs.pipe(out, { end: false });
      await once(rs, 'end');
    } catch {
      // skip unreadable files
      out.write(`[unavailable: ${srcPath}]\n`);
    }
  }

  await new Promise<void>((r) => out.end(r));
  return outPath;
}

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
 * naive CSV escape: double any quotes and wrap with quotes if needed
 *
 * @param v
 */
function csvCell(v: string): string {
  if (v == null) return '';
  const needs = /[",\n]/.test(v);
  const s = String(v).replace(/"/g, '""');
  return needs ? `"${s}"` : s;
}

/**
 * Stream an array of failing updates to a CSV file.
 * This overwrites any existing file at destPath.
 *
 * Columns: primaryKey, uploadedAt, error, updateJson, sourceFile
 *
 * @param rows
 * @param destPath
 */
export async function writeFailingUpdatesCsv(
  rows: FailingUpdateRow[],
  destPath: string,
): Promise<string> {
  const ws = createWriteStream(destPath, { flags: 'w' });
  // header
  ws.write('primaryKey,uploadedAt,error,updateJson,sourceFile\n');
  for (const r of rows) {
    ws.write(
      `${[
        csvCell(r.primaryKey),
        csvCell(r.uploadedAt),
        csvCell(r.error),
        csvCell(r.updateJson),
        csvCell(r.sourceFile ?? ''),
      ].join(',')}\n`,
    );
  }
  await new Promise<void>((r) => ws.end(r));
  return destPath;
}

/**
 * Convenience helper to parse failing updates out of a receipts.json file.
 * Returns rows you can merge into your in-memory buffer.
 *
 * @param receiptPath
 * @param sourceFile
 */
export function readFailingUpdatesFromReceipt(
  receiptPath: string,
  sourceFile?: string,
): FailingUpdateRow[] {
  try {
    const raw = readFileSync(receiptPath, 'utf8');
    const json = JSON.parse(raw) as any;
    const failing = json?.failingUpdates ?? {};
    const out: FailingUpdateRow[] = [];
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
