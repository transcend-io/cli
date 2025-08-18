import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { once } from 'node:events';
import { Parser } from 'csv-parse';
import { basename, dirname, join } from 'node:path';
import colors from 'colors';
import * as fastcsv from 'fast-csv';
import { logger } from '../../logger';

/**
 * Options for chunking a single CSV file
 */
export type ChunkOpts = {
  /** Path to the CSV file to chunk */
  filePath: string;
  /** Output directory for chunk files; defaults to the same directory as the input file */
  outputDir?: string;
  /** Clear output directory before starting */
  clearOutputDir: boolean;
  /** Chunk size in MB */
  chunkSizeMB: number;
  /** Callback for progress updates */
  onProgress: (processed: number, total?: number) => void;
};

/**
 * Create a CSV writer (fast-csv formatter piped to a write stream) that writes
 * a header line first, and then accepts object rows. Returns a tiny API to
 * write rows with backpressure handling and to close the file cleanly.
 *
 * @param filePath - The path to the output CSV file
 * @param headers - The headers for the CSV file
 * @returns An object with `write` and `end` methods
 */
function createCsvChunkWriter(
  filePath: string,
  headers: string[],
): {
  /** Write a row object to the CSV file */
  write: (row: Record<string, unknown>) => Promise<void>;
  /** Close the CSV file, ensuring all data is flushed */
  end: () => Promise<void>;
} {
  const ws = createWriteStream(filePath);
  const csv = fastcsv.format({ headers, writeHeaders: true, objectMode: true });
  // Pipe csv → file stream
  csv.pipe(ws);

  return {
    /**
     * Write a row object to the CSV file.
     *
     * @param row - The row data as an object
     */
    async write(row) {
      // Respect backpressure from fast-csv formatter
      const ok = csv.write(row);
      if (!ok) {
        await once(csv, 'drain');
      }
    },
    /**
     * Close the CSV file, ensuring all data is flushed.
     */
    async end() {
      // End formatter; wait for underlying file stream to finish flush/close
      const finished = Promise.all([once(ws, 'finish')]);
      csv.end();
      await finished;
    },
  };
}

/**
 * Zero-pad chunk numbers to four digits (e.g., 1 → "0001").
 *
 * @param n - The chunk number to pad
 * @returns The padded chunk number as a string
 */
function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

/**
 * Approximate row size in bytes using comma-joined field values.
 *
 * @param obj - The row object to estimate size for
 * @returns Approximate byte size of the row when serialized as CSV
 */
function approxRowBytes(obj: Record<string, unknown>): number {
  // naive but fast; adequate for chunk rollover thresholding
  return Buffer.byteLength(
    Object.values(obj)
      .map((v) => (v == null ? '' : String(v)))
      .join(','),
    'utf8',
  );
}

/**
 * Stream a single CSV file and write chunk files of roughly chunkSizeMB.
 * - Writes header to each chunk.
 * - Logs periodic progress via onProgress.
 *
 * @param opts - Options for chunking the file
 * @returns Promise that resolves when done
 */
export async function chunkOneCsvFile(opts: ChunkOpts): Promise<void> {
  const { filePath, outputDir, clearOutputDir, chunkSizeMB, onProgress } = opts;

  const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
  const baseName = basename(filePath, '.csv');
  const outDir = outputDir || dirname(filePath);
  await mkdir(outDir, { recursive: true });

  // Clear previous chunk files for this base
  if (clearOutputDir) {
    const files = await readdir(outDir);
    await Promise.all(
      files
        .filter((f) => f.startsWith(`${baseName}_chunk_`) && f.endsWith('.csv'))
        .map((f) => unlink(join(outDir, f))),
    );
  }

  let headerRow: string[] | null = null;
  let expectedCols: number | null = null;
  let totalLines = 0;
  let currentChunk = 1;
  let currentSize = 0;

  const parser = new Parser({
    columns: false,
    skip_empty_lines: true,
  });

  // Current active chunk writer; created after we know headers
  let writer: {
    /** Write a row object to the current chunk file */
    write: (row: Record<string, unknown>) => Promise<void>;
    /** Close the current chunk file */
    end: () => Promise<void>;
  } | null = null;

  // Returns current chunk file path — chunk number is always 4-digit padded
  const currentChunkPath = (): string =>
    join(outDir, `${baseName}_chunk_${pad4(currentChunk)}.csv`);

  const t = new Transform({
    objectMode: true,
    /**
     * Transform each row of the CSV file into a chunk.
     *
     * @param row - The current row being processed
     * @param _enc - Encoding (not used)
     * @param cb - Callback to signal completion or error
     */
    async transform(row: string[], _enc, cb) {
      try {
        // First row is the header
        if (!headerRow) {
          headerRow = row.slice(0);
          expectedCols = headerRow.length;

          // Open first chunk with header asynchronously
          writer = createCsvChunkWriter(currentChunkPath(), headerRow);
          cb();
          return;
        }

        // sanity check rows (non-fatal)
        if (expectedCols !== null && row.length !== expectedCols) {
          // optionally log a warning or collect metrics
          logger.warn(
            colors.yellow(
              `Row has ${row.length} cols; expected ${expectedCols}`,
            ),
          );
        }

        totalLines += 1;
        if (totalLines % 250_000 === 0) {
          onProgress(totalLines);
        }

        // Build row object using the original header
        const obj = Object.fromEntries(headerRow!.map((h, i) => [h, row[i]]));

        // Determine the row size up-front
        const rowBytes = approxRowBytes(obj);

        // If adding this row would exceed the threshold, roll first,
        // so this row becomes the first row in the next chunk.
        if (
          writer &&
          currentSize > 0 &&
          currentSize + rowBytes > chunkSizeBytes
        ) {
          await writer.end();
          currentChunk += 1;
          currentSize = 0;
          writer = createCsvChunkWriter(currentChunkPath(), headerRow!);
        }

        // Ensure writer exists (should after header)
        if (!writer) {
          writer = createCsvChunkWriter(currentChunkPath(), headerRow!);
        }

        // Write row and update approximate size
        await writer.write(obj);
        currentSize += rowBytes;

        cb();
      } catch (e) {
        cb(e as Error);
      }
    },

    // Ensure final file is closed
    /**
     * Flush is called when the readable has ended; we close any open writer.
     *
     * @param cb - Callback to signal completion or error
     */
    async flush(cb) {
      try {
        if (writer) {
          await writer.end();
          writer = null;
        }
        cb();
      } catch (e) {
        cb(e as Error);
      }
    },
  });

  const rs = createReadStream(filePath);
  await pipeline(rs, parser, t);

  // Final progress tick
  onProgress(totalLines);
  logger.info(
    colors.green(
      `Chunked ${filePath} into ${currentChunk} file(s); processed ${totalLines.toLocaleString()} rows.`,
    ),
  );
}
