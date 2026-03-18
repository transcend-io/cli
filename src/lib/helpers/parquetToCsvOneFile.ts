import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import colors from 'colors';
import { logger } from '../../logger';
import type { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

/** Progress callback used by the parent runner to surface progress to the UI. */
type OnProgress = (processed: number, total?: number) => void;

/**
 * Options for converting a single Parquet file into a single CSV file.
 */
export type ParquetToCsvOneFileOptions = {
  /** Absolute or relative path to the input `.parquet` file. */
  filePath: string;
  /**
   * Directory where the output CSV will be written.
   * If omitted, the CSV is written next to the input file.
   */
  outputDir?: string;
  /**
   * When true, removes a pre-existing output file with the same name before writing.
   * Useful for re-runs; ignored if the file does not exist.
   */
  clearOutputDir: boolean;
  /**
   * Optional progress hook. Called with the number of processed records.
   * `total` is not computed here; it will be `undefined`.
   */
  onProgress?: OnProgress;
};

/**
 * Convert a single Parquet file to a single CSV file (1:1) using DuckDB.
 *
 * Output naming: `${basename}.csv` in `outputDir ?? dirname(filePath)`.
 *
 * Errors:
 *  - Throws on I/O failures or DuckDB execution errors.
 *
 *  Why DuckDB?
 * - Robust reader for many Parquet dialects (e.g., Spark output, nested types, timestamps).
 * - Streaming COPY handles large files without loading everything into JS memory.
 *
 * What this does:
 *  - Opens an in-memory DuckDB database (no `.db` file created).
 *  - Optionally disables temp spilling to disk (so only your CSV is written).
 *  - Executes a single `COPY (SELECT * FROM read_parquet(...)) TO ...` statement.
 *  - Produces exactly one CSV per input Parquet (no chunking or rotation).
 *
 * Notes & defaults:
 *  - DuckDBInstance: `:memory:` (ephemeral). No persistent DB file is created.
 *  - Temp files: disabled via `PRAGMA temp_directory=''` (best-effort; ignored if unsupported).
 *  - CSV format: header row, comma delimiter, double-quote quoting, empty string for NULL.
 *  - Progress: DuckDB COPY doesn't expose row-level progress via the JS API; we emit a
 *    best-effort final callback.
 *
 * Requirements:
 *  - `@duckdb/node-api` npm package installed and available at runtime.
 *  - Supported platform binary (mac arm64/x64, linux x64, windows x64).
 *
 * @param opts - Conversion options
 * @param DuckDb - DuckDB instance to use
 * @returns Promise<void> when the CSV has been written
 */
export async function parquetToCsvOneFile(
  opts: ParquetToCsvOneFileOptions,
  DuckDb: typeof DuckDBInstance,
): Promise<void> {
  const { filePath, outputDir, clearOutputDir, onProgress } = opts;

  const baseDir = outputDir || dirname(filePath);
  const { name: baseName } = parse(filePath);
  const outPath = join(baseDir, `${baseName}.csv`);

  // Ensure output directory exists
  mkdirSync(baseDir, { recursive: true });

  // Remove any pre-existing output file if requested
  if (clearOutputDir && existsSync(outPath)) {
    try {
      rmSync(outPath, { force: true });
    } catch (err) {
      logger.warn(
        colors.yellow(
          `Could not remove existing output file ${outPath}: ${
            (err as Error).message
          }`,
        ),
      );
    }
  }

  // In-memory DB: no .db file created on disk
  const db = await DuckDb.create(':memory:');
  const conn = await db.connect();

  try {
    // Optional: prevent DuckDB from creating temp files on disk (best-effort).
    // Some versions may ignore or error; we ignore such errors safely.
    await runIgnoreError(conn, "PRAGMA temp_directory='';");

    // Optionally: cap memory to encourage in-memory execution or fail-fast
    // (commented out by default; uncomment to enforce a limit)
    // await runIgnoreError(conn, "PRAGMA memory_limit='4GB';");

    // Ensure stable CSV settings: header, comma delimiter, double quotes, empty string for NULLs.
    // Escape single quotes for SQL string literals
    const q = (p: string): string => `'${p.replace(/'/g, "''")}'`;

    // Use COPY with a subquery so DuckDB streams Parquet -> CSV efficiently.
    const sql = `
      COPY (SELECT * FROM read_parquet(${q(filePath)}))
      TO ${q(outPath)}
      (HEADER, DELIMITER ',', QUOTE '"', ESCAPE '"', NULL '');
    `;

    await run(conn, sql);

    // Best-effort progress notification (DuckDB JS API doesn't expose progress for COPY)
    onProgress?.(0, undefined);

    logger.info(colors.green(`Wrote CSV → ${outPath}`));
  } finally {
    // Close connection + db handles gracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await disposeSafe(conn as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await disposeSafe(db as any);
  }
}

/* =============================================================================
 * DuckDB helpers
 * =============================================================================
 */

/**
 * Execute a SQL statement on a DuckDB connection and dispose the result.
 *
 * @param conn - DuckDB connection
 * @param sql  - SQL string to run
 * @returns Promise<void>
 */
async function run(conn: DuckDBConnection, sql: string): Promise<void> {
  const result = await conn.run(sql);
  // The high-level API returns a Result; ensure we dispose it to free buffers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await disposeSafe(result as any);
}

/**
 * Execute a SQL statement but ignore any error that occurs.
 * Useful for best-effort PRAGMAs that may not be supported across versions.
 *
 * @param conn - DuckDB connection
 * @param sql  - SQL string to run
 * @returns Promise<void>
 */
async function runIgnoreError(
  conn: DuckDBConnection,
  sql: string,
): Promise<void> {
  try {
    await run(conn, sql);
  } catch {
    // ignore
  }
}

/**
 * Dispose a DuckDB resource (connection or instance) if present.
 *
 * @param handle - Object exposing an async `dispose()` method
 * @returns Promise<void>
 */
async function disposeSafe(
  handle:
    | {
        /** Dispose handler */
        dispose: () => Promise<void>;
      }
    | null
    | undefined,
): Promise<void> {
  if (!handle || typeof handle.dispose !== 'function') return;
  try {
    await handle.dispose();
  } catch {
    // ignore
  }
}
