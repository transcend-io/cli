#!/usr/bin/env node

import { Parser } from 'csv-parse';
import { createReadStream } from 'fs';
import { basename, dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { writeCsvSync } from './cron/writeCsv';

/** Size of each chunk in bytes (need to stay under JS string size limit of 512MB) */
const CHUNK_SIZE = 500 * 1024 * 1024;

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
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    inputFile,
    outputDir,
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure inputFile is provided
  if (!inputFile) {
    logger.error(
      colors.red(
        'An input file must be provided. You can specify using --inputFile=/path/to/large.csv',
      ),
    );
    process.exit(1);
  }

  const baseFileName = basename(inputFile, '.csv');
  const outputDirectory = outputDir || dirname(inputFile);
  let currentChunkSize = 0;
  let currentChunkNumber = 1;
  let headerRow: string[] | null = null;
  let currentOutputFile: string | null = null;
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
     * @param encoding - The encoding of the chunk
     * @param callback - Callback function to signal completion
     */
    transform(chunk: string[], encoding, callback) {
      if (!headerRow) {
        headerRow = chunk;
        expectedColumnCount = headerRow.length;
        logger.info(
          colors.blue(
            `Found header row with ${expectedColumnCount} columns: ${headerRow.join(', ')}`,
          ),
        );
        callback();
        return;
      }

      // Validate row structure
      if (expectedColumnCount !== null && chunk.length !== expectedColumnCount) {
        logger.warn(
          colors.yellow(
            `Warning: Row ${totalLinesProcessed + 1} has ${chunk.length} columns, expected ${expectedColumnCount}`,
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

      // Write the current row immediately
      if (currentOutputFile) {
        const data = [{
          ...Object.fromEntries(
            headerRow.map((header, index) => [header, chunk[index]]),
          ),
        }];
        // Only write headers for the first row of each chunk
        writeCsvSync(currentOutputFile, data, currentChunkSize === rowSize);
      }

      if (currentChunkSize + rowSize > CHUNK_SIZE) {
        // Start new chunk
        currentOutputFile = join(outputDirectory, `${baseFileName}_chunk${currentChunkNumber}.csv`);
        logger.info(
          colors.yellow(
            `Starting new chunk ${currentChunkNumber} at ${currentOutputFile}`,
          ),
        );
        currentChunkSize = rowSize;
        currentChunkNumber += 1;
      } else {
        currentChunkSize += rowSize;
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
    }
  });

  const readStream = createReadStream(inputFile);

  try {
    logger.info(colors.blue(`Starting to process ${inputFile}...`));
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

// Run the main function if this file is being run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error(colors.red('Error:'), error);
    process.exit(1);
  });
}

export { main };
