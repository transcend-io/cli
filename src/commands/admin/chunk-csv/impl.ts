#!/usr/bin/env node

import { Parser } from 'csv-parse';
import { createReadStream, mkdirSync, unlinkSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import colors from 'colors';
import { logger } from '../../../logger';
import { appendCsvSync, writeCsvSync } from '../../../lib/cron';
import type { LocalContext } from '../../../context';

export interface ChunkCsvCommandFlags {
  inputFile: string;
  outputDir?: string;
  clearOutputDir: boolean;
  chunkSizeMB: number;
}

/**
 * Format memory usage for logging
 *
 * @param memoryData - The NodeJS memory usage data to format
 * @returns A formatted string showing memory usage in MB
 */
function formatMemoryUsage(memoryData: NodeJS.MemoryUsage): string {
  return Object.entries(memoryData)
    .map(([key, value]) => `${key}: ${(value / 1024 / 1024).toFixed(2)} MB`)
    .join(', ');
}

/**
 * Chunks a large CSV file into smaller files of approximately 1.5GB each
 * Note that you may need to increase the node memory limit for this script to run!!
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-chunk-csv.ts --inputFile=./working/full_export.csv
 *
 * Standard usage:
 * yarn tr-chunk-csv --inputFile=/path/to/large.csv --outputDir=/path/to/output
 *
 * @param this - The local context (not used here, but required by the CLI framework)
 * @param flags - The command line flags containing input file, output directory, and chunk size
 * @returns A promise that resolves when the chunking is complete
 */
export async function chunkCsvImpl(
  this: LocalContext,
  flags: ChunkCsvCommandFlags,
): Promise<void> {
  const { inputFile, outputDir, chunkSizeMB, clearOutputDir } = flags;

  // Ensure inputFile is provided
  if (!inputFile) {
    logger.error(
      colors.red(
        'An input file must be provided. You can specify using --inputFile=/path/to/large.csv',
      ),
    );
    process.exit(1);
  }

  const chunkSize = Math.floor((chunkSizeMB || chunkSizeMB) * 1024 * 1024);

  const baseFileName = basename(inputFile, '.csv');
  const outputDirectory = outputDir || dirname(inputFile);
  mkdirSync(outputDirectory, { recursive: true });

  // clear previous files
  if (clearOutputDir) {
    logger.info(colors.blue(`Clearing output directory: ${outputDirectory}`));
    try {
      const files = await readdir(outputDirectory);
      await Promise.all(
        files
          .filter((file) => file.startsWith(`${baseFileName}_chunk`))
          .map((file) => unlinkSync(join(outputDirectory, file))),
      );
      logger.info(colors.green('Output directory cleared.'));
    } catch (error) {
      logger.error(colors.red('Error clearing output directory:'), error);
      process.exit(1);
    }
  }

  let currentChunkSize = 0;
  let currentChunkNumber = 1;
  let headerRow: string[] | null = null;
  let currentOutputFile = join(outputDirectory, `${baseFileName}_chunk1.csv`);
  let expectedColumnCount: number | null = null;
  let totalLinesProcessed = 0;

  const parser = new Parser({
    columns: false,
    skip_empty_lines: true,
  });

  const chunker = new Transform({
    objectMode: true,
    /**
     * Transform function that processes each chunk of CSV data
     *
     * @param chunk - Array of strings representing a CSV row
     * @param _encoding - The encoding of the chunk
     * @param callback - Callback function to signal completion
     */
    transform(chunk: string[], _encoding, callback) {
      if (!headerRow) {
        headerRow = chunk;
        expectedColumnCount = headerRow.length;
        logger.info(
          colors.blue(
            `Found header row with ${expectedColumnCount} columns: ${headerRow.join(
              ', ',
            )}`,
          ),
        );
        callback();
        return;
      }

      // Validate row structure
      if (
        expectedColumnCount !== null &&
        chunk.length !== expectedColumnCount
      ) {
        logger.warn(
          colors.yellow(
            `Warning: Row ${totalLinesProcessed + 1} has ${
              chunk.length
            } columns, expected ${expectedColumnCount}`,
          ),
        );
      }

      totalLinesProcessed += 1;
      if (totalLinesProcessed % 1_000_000 === 0) {
        const memoryUsage = formatMemoryUsage(process.memoryUsage());
        logger.info(
          colors.blue(
            `Processed ${totalLinesProcessed.toLocaleString()} lines... ` +
              `Memory usage: ${memoryUsage}`,
          ),
        );
      }

      const rowSize = Buffer.byteLength(chunk.join(','), 'utf8');

      // Prepare row object from header/values
      const data = [
        {
          ...Object.fromEntries(
            headerRow.map((header, index) => [header, chunk[index]]),
          ),
        },
      ];

      // If this is the first write of the current chunk, write with headers
      if (currentChunkSize === 0) {
        logger.info(
          colors.yellow(
            `Starting new chunk ${currentChunkNumber} at ${currentOutputFile}`,
          ),
        );
        writeCsvSync(currentOutputFile, data, headerRow);
        currentChunkSize += rowSize;
      } else {
        appendCsvSync(currentOutputFile, data);
        currentChunkSize += rowSize;
      }

      // Determine if we need to start a new chunk
      if (currentChunkSize >= chunkSize) {
        currentChunkNumber += 1;
        currentChunkSize = 0;
        currentOutputFile = join(
          outputDirectory,
          `${baseFileName}_chunk${currentChunkNumber}.csv`,
        );
      }

      callback();
    },
    /**
     * Flush function that writes the final chunk of data
     *
     * @param callback - Callback function to signal completion
     */
    flush(callback) {
      callback();
    },
  });

  const readStream = createReadStream(inputFile);

  try {
    logger.info(
      colors.blue(`Starting to process ${inputFile}... for ${chunkSizeMB}MB`),
    );
    await pipeline(readStream, parser, chunker);
    logger.info(
      colors.green(
        `Successfully chunked ${inputFile} into ${currentChunkNumber} files ` +
          `(${totalLinesProcessed.toLocaleString()} total lines processed)`,
      ),
    );
  } catch (error) {
    logger.error(colors.red('Error chunking CSV file:'), error);
    process.exit(1);
  }
}
