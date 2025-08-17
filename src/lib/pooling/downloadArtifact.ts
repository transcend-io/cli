// lib/pooling/downloadArtifacts.ts
import {
  createReadStream,
  createWriteStream,
  statSync,
  readFileSync,
  mkdirSync,
} from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { once } from 'node:events';
import type { getWorkerLogPaths } from './spawnWorkerProcess';

/** Which combined log to export */
export type LogKind = 'error' | 'warn' | 'info' | 'all';

/** Convenience alias for the optional return from getWorkerLogPaths */
type SlotPaths = Map<number, ReturnType<typeof getWorkerLogPaths> | undefined>;
/**
 *
 */
type WorkerPaths = NonNullable<ReturnType<typeof getWorkerLogPaths>>;

/**
 * Choose the best source file for a given kind, with safe fallbacks:
 *  - error: prefer errorPath → fallback to errPath
 *  - warn:  prefer warnPath  → fallback to errPath
 *  - info:  prefer infoPath  → fallback to outPath
 *
 * @param kind
 * @param p
 */
function pickSourcePath(
  kind: Exclude<LogKind, 'all'>,
  p: WorkerPaths,
): string | undefined {
  if (kind === 'error') return (p as any).errorPath || p.errPath;
  if (kind === 'warn') return (p as any).warnPath || p.errPath;
  // kind === 'info'
  return (p as any).infoPath || p.outPath;
}

/**
 * Combine all worker logs of the given kind into a single file.
 * Writes simple headers per worker and concatenates in worker-id order.
 *
 * @param slotLogPaths - Map of workerId -> WorkerLogPaths
 * @param kind - 'error' | 'warn' | 'info' | 'all'
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
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, filename ?? `combined-${kind}.log`);
  const out = createWriteStream(outPath, { flags: 'w' });

  for (const [id, pathsMaybe] of [...slotLogPaths.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    if (!pathsMaybe) continue;
    const p = pathsMaybe as WorkerPaths;

    // Worker header
    out.write(`\n==== worker ${id} ====\n`);

    if (kind === 'all') {
      // Concatenate stdout, stderr, and structured (if present)
      const sources: Array<{
        /** */ label: string /** */;
        /** */
        path?: string;
      }> = [
        { label: 'stdout', path: p.outPath },
        { label: 'stderr', path: p.errPath },
        { label: 'structured', path: (p as any).structuredPath },
      ];

      for (const { label, path } of sources) {
        out.write(
          `\n---- ${label}${path ? ` (${basename(path)})` : ''} ----\n`,
        );
        if (!path) {
          out.write('[unavailable]\n');
          continue;
        }
        try {
          const st = statSync(path);
          if (st.size === 0) {
            out.write('[empty]\n');
            continue;
          }
          const rs = createReadStream(path, { encoding: 'utf8' });
          rs.pipe(out, { end: false });
          await once(rs, 'end');
        } catch {
          out.write(`[unavailable: ${path}]\n`);
        }
      }
      continue;
    }

    // error / warn / info (single best source with fallback)
    const srcPath = pickSourcePath(kind, p);
    out.write(`(${srcPath ? basename(srcPath) : 'unavailable'})\n`);

    if (!srcPath) {
      out.write('[unavailable]\n');
      continue;
    }

    try {
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
 * Overwrites any existing file at destPath.
 *
 * Columns: primaryKey,uploadedAt,error,updateJson,sourceFile
 *
 * @param rows
 * @param destPath
 */
export async function writeFailingUpdatesCsv(
  rows: FailingUpdateRow[],
  destPath: string,
): Promise<string> {
  mkdirSync(dirname(destPath), { recursive: true });
  const ws = createWriteStream(destPath, { flags: 'w' });
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
 * Parse failing updates out of a receipts.json file.
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
