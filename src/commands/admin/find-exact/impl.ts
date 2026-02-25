import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fg from 'fast-glob';
import colors from 'colors';
import type { LocalContext } from '../../../context';
import { logger } from '../../../logger';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

/** CLI flags accepted by the `find-exact` command. */
export type FindExactCommandFlags = {
  /** The exact string to search for */
  needle: string;
  /** Root directory to search */
  root: string;
  /** Comma-separated file extensions */
  exts: string;
  /** Skip parquet file scanning */
  noParquet: boolean;
  /** Max concurrent file scans */
  concurrency: number;
  /** Stop scanning each file after N bytes */
  maxBytes?: number;
};

/**
 * Streams through a file checking if it contains the needle (case-insensitive).
 *
 * @param filePath - Absolute path to the file to scan
 * @param needle - Lowercased needle as a Buffer
 * @param maxBytes - Optional byte limit per file
 * @returns Whether the file contains the needle
 */
function fileContainsExactBytes(
  filePath: string,
  needle: Buffer,
  maxBytes?: number,
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    let carry = Buffer.alloc(0);
    const n = needle.length;
    let seen = 0;

    stream.on('data', (raw: Buffer) => {
      let chunk = raw;

      if (maxBytes) {
        const remaining = maxBytes - seen;
        if (remaining <= 0) {
          stream.destroy();
          resolve(false);
          return;
        }
        if (chunk.length > remaining) {
          chunk = chunk.subarray(0, remaining);
        }
        seen += chunk.length;
      }

      const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      const haystack = buf.toString('utf8').toLowerCase();
      if (haystack.includes(needle.toString('utf8'))) {
        stream.destroy();
        resolve(true);
        return;
      }

      // Keep last n-1 bytes to catch boundary matches
      if (n > 1) {
        carry = Buffer.from(buf.subarray(Math.max(0, buf.length - (n - 1))));
      } else {
        carry = Buffer.alloc(0);
      }
    });

    stream.on('error', reject);
    stream.on('close', () => resolve(false));
    stream.on('end', () => resolve(false));
  });
}

/**
 * Run async workers over items with bounded concurrency.
 *
 * @param items - Array of items to process
 * @param limit - Maximum concurrent workers
 * @param worker - Async function to run per item
 * @returns Resolves when all items are processed
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = idx;
        idx += 1;
        if (current >= items.length) return;
        await worker(items[current]);
      }
    },
  );
  await Promise.all(runners);
}

/**
 * Execute a DuckDB query and return stdout.
 *
 * @param duckdbPath - Path to the duckdb binary
 * @param sql - SQL query to execute
 * @returns The stdout output from duckdb
 */
function duckdbQuery(duckdbPath: string, sql: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(duckdbPath, ['-noheader', '-batch', '-cmd', sql], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`duckdb exited ${code}: ${stderr}`));
    });
  });
}

/**
 * Get all VARCHAR/STRING column names from a parquet file.
 *
 * @param duckdbPath - Path to the duckdb binary
 * @param filePath - Absolute path to the parquet file
 * @returns Array of string column names
 */
async function duckdbGetParquetStringColumns(
  duckdbPath: string,
  filePath: string,
): Promise<string[]> {
  const escaped = filePath.replace(/'/g, "''");
  const sql = [
    'SELECT column_name',
    `FROM parquet_schema('${escaped}')`,
    "WHERE lower(column_type) LIKE '%varchar%'",
    "   OR lower(column_type) LIKE '%string%';",
  ].join('\n');

  const out = await duckdbQuery(duckdbPath, sql);
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Check if any string column in a parquet file contains the needle value.
 *
 * @param duckdbPath - Path to the duckdb binary
 * @param filePath - Absolute path to the parquet file
 * @param needle - The string to search for (exact equality per column)
 * @returns Whether any row/column matches
 */
async function parquetFileHasExactString(
  duckdbPath: string,
  filePath: string,
  needle: string,
): Promise<boolean> {
  const cols = await duckdbGetParquetStringColumns(duckdbPath, filePath);
  if (cols.length === 0) return false;

  const escaped = filePath.replace(/'/g, "''");
  const orChain = cols
    .map((c) => `"${c.replace(/"/g, '""')}" = '${needle.replace(/'/g, "''")}'`)
    .join(' OR ');

  const sql = [
    `SELECT 1 AS hit FROM read_parquet('${escaped}')`,
    `WHERE ${orChain}`,
    'LIMIT 1;',
  ].join('\n');

  const out = await duckdbQuery(duckdbPath, sql);
  return out.trim().length > 0;
}

/**
 * Entrypoint for the `admin find-exact` command.
 *
 * Recursively searches files under --root for the --needle string, outputting
 * matching file paths. Supports text-based files via streaming byte scan and
 * parquet files via DuckDB.
 *
 * @param this - Bound CLI context
 * @param flags - CLI flags for the run
 */
export async function findExact(
  this: LocalContext,
  flags: FindExactCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const { needle, root, exts, noParquet, concurrency, maxBytes } = flags;
  const rootAbs = path.resolve(root);

  const extSet = new Set(
    exts
      .split(',')
      .map((x) => x.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean),
  );
  const patterns = Array.from(extSet).map((e) => `**/*.${e}`);

  logger.info(
    colors.green(
      `Searching for "${needle}" in ${rootAbs} (exts: ${[...extSet].join(
        ', ',
      )})`,
    ),
  );

  const normalFiles = await fg(patterns, {
    cwd: rootAbs,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    suppressErrors: true,
  });

  const needleBuf = Buffer.from(needle.toLowerCase(), 'utf8');
  const hits: string[] = [];

  await runWithConcurrency(normalFiles, concurrency, async (file) => {
    try {
      const ok = await fileContainsExactBytes(file, needleBuf, maxBytes);
      if (ok) {
        hits.push(file);
        this.process.stdout.write(`${file}\n`);
      }
    } catch {
      // ignore unreadable files
    }
  });

  if (!noParquet) {
    const parquetFiles = await fg(['**/*.parquet'], {
      cwd: rootAbs,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      suppressErrors: true,
    });

    if (parquetFiles.length > 0) {
      logger.info(
        colors.green(
          `Scanning ${parquetFiles.length} parquet file(s) via DuckDB...`,
        ),
      );

      await runWithConcurrency(
        parquetFiles,
        Math.max(2, Math.floor(concurrency / 4)),
        async (file) => {
          try {
            const ok = await parquetFileHasExactString('duckdb', file, needle);
            if (ok) {
              hits.push(file);
              this.process.stdout.write(`${file}\n`);
            }
          } catch {
            // ignore parquet read issues
          }
        },
      );
    }
  }

  logger.info(colors.green(`Done. Found ${hits.length} matching file(s).`));
}
