#!/usr/bin/env node

import { Parser } from 'csv-parse';
import { createReadStream } from 'fs';
import { basename, dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { writeCsv } from './cron/writeCsv';

/** Size of each chunk in bytes (1.5GB) */
const CHUNK_SIZE = 1.5 * 1024 * 1024 * 1024;

/**
 * Chunks a large CSV file into smaller files of approximately 1.5GB each
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-chunk-csv.ts --inputFile=/path/to/large.csv --outputDir=/path/to/output
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
  let currentChunkRows: string[][] = [];
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
        logger.info(colors.blue('Found header row with columns:'), headerRow.join(', '));
        callback();
        return;
      }

      totalLinesProcessed += 1;
      if (totalLinesProcessed % 100000 === 0) {
        logger.info(
          colors.blue(
            `Processed ${totalLinesProcessed.toLocaleString()} lines...`,
          ),
        );
      }

      const rowSize = Buffer.byteLength(chunk.join(','), 'utf8');

      if (currentChunkSize + rowSize > CHUNK_SIZE) {
        // Write current chunk to file
        const outputFile = join(outputDirectory, `${baseFileName}_chunk${currentChunkNumber}.csv`);
        logger.info(
          colors.yellow(
            `Writing chunk ${currentChunkNumber} to ${outputFile} (${currentChunkRows.length.toLocaleString()} rows)`,
          ),
        );

        const data = currentChunkRows.map((row) => {
          const obj: Record<string, string> = {};
          headerRow?.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        // Write header and rows
        if (headerRow) {
          writeCsv(outputFile, data, headerRow);
        }

        // Reset for next chunk
        currentChunkSize = rowSize;
        currentChunkNumber += 1;
        currentChunkRows = [chunk];
      } else {
        currentChunkSize += rowSize;
        currentChunkRows.push(chunk);
      }

      callback();
    },
    /**
     * Flush function that writes the final chunk of data
     *
     * @param callback - Callback function to signal completion
     */
    flush(callback) {
      // Write the last chunk if there are any rows and we have a header
      if (currentChunkRows.length > 0 && headerRow) {
        const outputFile = join(outputDirectory, `${baseFileName}_chunk${currentChunkNumber}.csv`);
        logger.info(
          colors.yellow(
            `Writing final chunk ${currentChunkNumber} to ${outputFile} (${currentChunkRows.length.toLocaleString()} rows)`,
          ),
        );

        const data = currentChunkRows.map((row) => {
          const obj: Record<string, string> = {};
          // We know headerRow is not null here because of the if condition above
          headerRow!.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        // Write header and rows
        writeCsv(outputFile, data, headerRow);
      }
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
