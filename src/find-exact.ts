#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fg from 'fast-glob';

/**
 *
 */
type Options = {
  /** */
  root: string;
  /** */
  needle: string;
  /** */
  exts: Set<string>;
  /** */
  includeParquet: boolean;
  /** */
  concurrency: number;
  /** */
  maxBytes?: number; // optional: stop scanning a file after N bytes
};

/**
 *
 */
function parseArgs(): Options {
  const args = process.argv.slice(2);

  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };

  const root = get('--root') ?? '.';
  const needle = get('--needle');
  if (!needle) {
    console.error('Missing --needle "..."');
    process.exit(2);
  }

  const extsRaw = get('--exts') ?? 'csv,json,txt,ndjson,log';
  const includeParquet = !args.includes('--no-parquet');
  const concurrency = Number(get('--concurrency') ?? '16');
  const maxBytesStr = get('--max-bytes');
  const maxBytes = maxBytesStr ? Number(maxBytesStr) : undefined;

  return {
    root,
    needle,
    exts: new Set(
      extsRaw
        .split(',')
        .map((x) => x.trim().replace(/^\./, '').toLowerCase())
        .filter(Boolean),
    ),
    includeParquet,
    concurrency:
      Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 16,
    maxBytes: maxBytes && maxBytes > 0 ? maxBytes : undefined,
  };
}

/**
 *
 * @param filePath
 * @param needle
 * @param maxBytes
 */
async function fileContainsExactBytes(
  filePath: string,
  needle: Buffer,
  maxBytes?: number,
): Promise<boolean> {
  return await new Promise<boolean>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    let carry = Buffer.alloc(0);
    const n = needle.length;

    let seen = 0;

    stream.on('data', (chunk: Buffer) => {
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

      // keep last n-1 bytes to catch boundary matches
      if (n > 1) {
        carry = buf.subarray(Math.max(0, buf.length - (n - 1))) as any;
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
 *
 * @param items
 * @param limit
 * @param worker
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        await worker(items[idx]);
      }
    },
  );
  await Promise.all(runners);
}

/**
 * Parquet search strategy:
 * - DuckDB can read parquet quickly.
 * - We ask DuckDB to scan each parquet file and return 1 row if any string column contains the needle.
 *
 * Note: exact byte match inside parquet isn’t meaningful (compressed/encoded). We do exact string match:
 *   col = 'needle' OR contains(col, 'needle') depending on your preference.
 *
 * Here: we use exact equality on ANY string column. (You can change to LIKE/contains if you want.)
 *
 * @param duckdbPath
 * @param filePath
 * @param needle
 */
async function parquetFileHasExactString(
  duckdbPath: string,
  filePath: string,
  needle: string,
): Promise<boolean> {
  // Build a DuckDB query that:
  // 1) introspects schema
  // 2) checks any VARCHAR column for equality to needle
  //
  // We do it in a single DuckDB invocation for the file.
  const sql = `
WITH cols AS (
  SELECT column_name
  FROM parquet_schema('${filePath.replace(/'/g, "''")}')
  WHERE lower(column_type) LIKE '%varchar%' OR lower(column_type) LIKE '%string%'
),
q AS (
  SELECT 1 AS hit
  FROM read_parquet('${filePath.replace(/'/g, "''")}')
  WHERE ${/* OR-chain across string cols */ ''}
    ${
      // If no string cols, make it FALSE
      '(SELECT count(*) FROM cols) = 0'
    } = FALSE
    AND (
      ${'__OR_CHAIN__'}
    )
  LIMIT 1
)
SELECT hit FROM q;
`.trim();

  // We need to replace __OR_CHAIN__ with OR conditions dynamically.
  // DuckDB doesn't easily allow dynamic SQL without a second layer, so we do a 2-step:
  // - First: get string column names
  // - Second: run the OR query
  const cols = await duckdbGetParquetStringColumns(duckdbPath, filePath);
  if (cols.length === 0) return false;

  const orChain = cols
    .map((c) => `"${c.replace(/"/g, '""')}" = '${needle.replace(/'/g, "''")}'`)
    .join(' OR ');

  const finalSql = sql.replace('__OR_CHAIN__', orChain);

  const out = await duckdbQuery(duckdbPath, finalSql);
  return out.trim().length > 0; // any output row means hit
}

/**
 *
 * @param duckdbPath
 * @param filePath
 */
async function duckdbGetParquetStringColumns(
  duckdbPath: string,
  filePath: string,
): Promise<string[]> {
  const sql = `
SELECT column_name
FROM parquet_schema('${filePath.replace(/'/g, "''")}')
WHERE lower(column_type) LIKE '%varchar%' OR lower(column_type) LIKE '%string%';
`.trim();
  const out = await duckdbQuery(duckdbPath, sql);
  // output is tab-separated by default
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 *
 * @param duckdbPath
 * @param sql
 */
async function duckdbQuery(duckdbPath: string, sql: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(duckdbPath, ['-noheader', '-batch', '-cmd', sql], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += String(d)));
    child.stderr.on('data', (d) => (stderr += String(d)));

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`duckdb exited ${code}: ${stderr}`));
    });
  });
}

/**
 *
 */
function findDuckdbBinary(): string | null {
  // rely on PATH
  return 'duckdb';
}

/**
 *
 */
async function main() {
  const opts = parseArgs();
  const rootAbs = path.resolve(opts.root);

  const patterns = Array.from(opts.exts).map((e) => `**/*.${e}`);
  // always include parquet separately
  const parquetPattern = '**/*.parquet';

  const normalFiles = await fg(patterns, {
    cwd: rootAbs,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    suppressErrors: true,
  });

  const needleBuf = Buffer.from(opts.needle.toLowerCase(), 'utf8');

  const hits: string[] = [];
  await runWithConcurrency(normalFiles, opts.concurrency, async (file) => {
    try {
      const ok = await fileContainsExactBytes(file, needleBuf, opts.maxBytes);
      if (ok) {
        hits.push(file);
        process.stdout.write(`${file}\n`);
      }
    } catch {
      // ignore unreadable files
    }
  });

  if (opts.includeParquet) {
    const duckdbPath = findDuckdbBinary();
    if (!duckdbPath) {
      console.error(
        'DuckDB not found in PATH; install duckdb or run with --no-parquet',
      );
      process.exit(2);
    }

    const parquetFiles = await fg([parquetPattern], {
      cwd: rootAbs,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      suppressErrors: true,
    });

    await runWithConcurrency(
      parquetFiles,
      Math.max(2, Math.floor(opts.concurrency / 4)),
      async (file) => {
        try {
          const ok = await parquetFileHasExactString(
            duckdbPath,
            file,
            opts.needle,
          );
          if (ok) {
            hits.push(file);
            process.stdout.write(`${file}\n`);
          }
        } catch {
          // ignore parquet read issues
        }
      },
    );
  }

  // If you want a summary at end:
  // console.error(`Done. Hits: ${hits.length}`);
}

main().catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exit(1);
});
