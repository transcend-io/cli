/* eslint-disable */
import type { LocalContext } from '../../../context';
import colors from 'colors';
import { createReadStream, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Transform, Writable } from 'node:stream';
import type { Got } from 'got';
import { parse } from 'csv-parse';
import { basename, join } from 'node:path';
import {
  writeFileSync,
  readFileSync,
  appendFileSync,
  createWriteStream,
} from 'node:fs';
import { logger } from '../../../logger';
import { createSombraGotInstance } from '../../../lib/graphql';
import * as cliProgress from 'cli-progress';
import { stringify } from 'csv-stringify';

// ============================================================================
// ERROR LOGGING UTILITIES
// ============================================================================

/**
 * Log failed records to a structured error file
 */
function logFailedRecords(
  errorLogFile: string,
  failedRecords: Array<{
    transformed: Record<string, any>;
    original: Record<string, string>;
  }>,
  errorDetails: {
    batchNumber: number;
    timestamp: string;
    errorMessage: string;
    apiResponse?: any;
  },
): void {
  try {
    const errorEntry = {
      ...errorDetails,
      failedCount: failedRecords.length,
      records: failedRecords.map((record, index) => ({
        recordIndex: index,
        originalCsvData: record.original,
        transformedRequestBody: record.transformed,
        keyIdentifiers: {
          email: record.original.email || null,
          transcendID: record.original.transcendID || null,
          birthDate: record.original.birthDate || null,
          partition: record.original.partition || null,
        },
      })),
    };

    // Append to error log file as NDJSON (newline delimited JSON)
    appendFileSync(
      errorLogFile,
      JSON.stringify(errorEntry, null, 0) + '\n',
      'utf8',
    );

    logger.info(
      colors.yellow(`   📝 Detailed error logged to: ${errorLogFile}`),
    );
  } catch (logErr) {
    logger.warn(
      colors.yellow(
        `   ⚠️  Could not write to error log: ${(logErr as Error).message}`,
      ),
    );
  }
}

// ============================================================================
// DATE PARSING AND VALIDATION UTILITIES
// ============================================================================

/**
 * Parse a date string that can be in either "MM-YYYY" or "YYYY-MM-DD" format.
 *
 * - "MM-YYYY" is normalized to the first of the given month.
 * - "YYYY-MM-DD" is used as-is.
 *
 * @param dateStr - Input date string
 * @returns A valid Date object in UTC
 * @throws Error if input is not a valid date string
 */
function parseDate(dateStr: string): Date {
  // Case 1: MM-YYYY
  const monthYearRegex = /^(\d{2})-(\d{4})$/;
  const monthYearMatch = dateStr.match(monthYearRegex);

  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    const normalized = `${year}-${month}-01T00:00:00Z`;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date parsed from input "${dateStr}"`);
    }
    return date;
  }

  // Case 2: YYYY-MM-DD
  const fullDateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (fullDateRegex.test(dateStr)) {
    const normalized = `${dateStr}T00:00:00Z`; // force UTC
    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date parsed from input "${dateStr}"`);
    }
    return date;
  }

  // Case 3: YYYY-MM
  const yearMonthRegex = /^(\d{4})-(\d{2})$/;
  const yearMonthMatch = dateStr.match(yearMonthRegex);

  if (yearMonthMatch) {
    const [, year, month] = yearMonthMatch;
    const normalized = `${year}-${month}-01T00:00:00Z`;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date parsed from input "${dateStr}"`);
    }
    return date;
  }

  throw new Error(
    `Input string "${dateStr}" is not in "MM-YYYY", "YYYY-MM", or "YYYY-MM-DD" format.`,
  );
}

// Checkpoint interfaces
export interface CheckpointData {
  /** Current file being processed */
  currentFile: string;
  /** Index of current file in files array */
  currentFileIndex: number;
  /** Total records processed so far across all files */
  totalProcessedRecords: number;
  /** Records processed in current file */
  recordsProcessedInCurrentFile: number;
  /** Timestamp of last checkpoint */
  lastCheckpoint: string;
  /** Files that have been completely processed */
  completedFiles: string[];
  /** Total statistics so far */
  totalStats: {
    totalFiltered: number;
    totalPassed: number;
    totalTransformed: number;
    totalUploaded: number;
    totalFailed: number;
    totalBatches: number;
  };
  /** Frequency map of birthdates from API responses */
  birthdateFrequency: Record<string, number>;
}

export interface BirthdateMigrationCommandFlags {
  /** The Transcend API key */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Partition key */
  partition: string;
  /** API URL for Transcend backend */
  transcendUrl: string;
  /** Input directory containing chunked CSV files */
  chunksDir: string;
  /** Output directory for transformed CSV files */
  outputDir: string;
  /** Whether to upload after transformation */
  upload: boolean;
  /** Whether to do a dry run */
  dryRun: boolean;
  /** Whether to upload as isSilent */
  isSilent: boolean;
  /** Attributes string pre-parse. In format Key:Value */
  attributes: string;
  /** Skip workflow triggers */
  skipWorkflowTriggers: boolean;
  /** Skip conflict updates */
  skipConflictUpdates: boolean;
  /** Whether to skip the check for existing records */
  skipExistingRecordCheck: boolean;
  /** Whether to force trigger workflows */
  forceTriggerWorkflows: boolean;
  /** Receipt file directory */
  receiptFileDir: string;
  /** Concurrency for uploads */
  concurrency: number;
  /** Maximum number of records to process (for testing) */
  maxRecords?: number;
  /** Checkpoint file path for resume functionality */
  checkpointFile?: string;
  /** Resume from checkpoint if it exists */
  resume?: boolean;
  /** Save checkpoint every N processed records */
  checkpointInterval?: number;
  /** Number of records to upload in each batch */
  batchSize: number;
  /** Output file for birthdate frequency analysis */
  frequencyMapFile: string;
}

// ============================================================================
// CHECKPOINT MANAGEMENT
// ============================================================================

/**
 * Save checkpoint data to file
 */
export function saveCheckpoint(
  checkpointFile: string,
  data: CheckpointData,
): void {
  try {
    writeFileSync(checkpointFile, JSON.stringify(data, null, 2), 'utf8');
    // Checkpoint saved silently
  } catch (err) {
    logger.error(
      colors.red(`❌ Failed to save checkpoint: ${(err as Error).message}`),
    );
  }
}

/**
 * Load checkpoint data from file
 */
export function loadCheckpoint(checkpointFile: string): CheckpointData | null {
  try {
    if (!existsSync(checkpointFile)) {
      return null;
    }

    const data = readFileSync(checkpointFile, 'utf8');
    const checkpoint = JSON.parse(data) as CheckpointData;

    logger.info(
      colors.green(
        `📥 Loaded checkpoint: resuming from ${checkpoint.currentFile} (${checkpoint.recordsProcessedInCurrentFile} records processed)`,
      ),
    );
    return checkpoint;
  } catch (err) {
    logger.error(
      colors.red(`❌ Failed to load checkpoint: ${(err as Error).message}`),
    );
    return null;
  }
}

/**
 * Initialize checkpoint data
 */
export function initializeCheckpoint(files: string[]): CheckpointData {
  return {
    currentFile: files[0] || '',
    currentFileIndex: 0,
    totalProcessedRecords: 0,
    recordsProcessedInCurrentFile: 0,
    lastCheckpoint: new Date().toISOString(),
    completedFiles: [],
    totalStats: {
      totalFiltered: 0,
      totalPassed: 0,
      totalTransformed: 0,
      totalUploaded: 0,
      totalFailed: 0,
      totalBatches: 0,
    },
    birthdateFrequency: {},
  };
}

/**
 * Update checkpoint with current progress
 */
export function updateCheckpoint(
  checkpoint: CheckpointData,
  currentFile: string,
  currentFileIndex: number,
  recordsProcessedInCurrentFile: number,
  totalProcessedRecords: number,
  fileCompleted = false,
  stats?: {
    filterStats: { total: number; passed: number; filtered: number };
    transformStats: { processed: number; transformed: number };
    uploadStats: { uploaded: number; failed: number; batches: number };
    birthdateFrequency?: Record<string, number>;
  },
): CheckpointData {
  const updated = {
    ...checkpoint,
    currentFile,
    currentFileIndex,
    recordsProcessedInCurrentFile: fileCompleted
      ? 0
      : recordsProcessedInCurrentFile,
    totalProcessedRecords,
    lastCheckpoint: new Date().toISOString(),
  };

  if (fileCompleted && !checkpoint.completedFiles.includes(currentFile)) {
    updated.completedFiles = [...checkpoint.completedFiles, currentFile];
  }

  if (stats) {
    updated.totalStats = {
      totalFiltered:
        checkpoint.totalStats.totalFiltered + stats.filterStats.filtered,
      totalPassed: checkpoint.totalStats.totalPassed + stats.filterStats.passed,
      totalTransformed:
        checkpoint.totalStats.totalTransformed +
        stats.transformStats.transformed,
      totalUploaded:
        checkpoint.totalStats.totalUploaded + stats.uploadStats.uploaded,
      totalFailed: checkpoint.totalStats.totalFailed + stats.uploadStats.failed,
      totalBatches:
        checkpoint.totalStats.totalBatches + stats.uploadStats.batches,
    };

    // Update birthdate frequency map if provided - merge with existing data
    if (stats.birthdateFrequency) {
      updated.birthdateFrequency = { ...checkpoint.birthdateFrequency };
      for (const [birthDate, count] of Object.entries(
        stats.birthdateFrequency,
      )) {
        updated.birthdateFrequency[birthDate] =
          (updated.birthdateFrequency[birthDate] || 0) + count;
      }
    }
  }

  return updated;
}

// ============================================================================
// BIRTHDATE FREQUENCY MAP UTILITIES
// ============================================================================

/**
 * Extract birthdates from API response metadata and update frequency map
 */
function updateBirthdateFrequency(
  frequencyMap: Record<string, number>,
  apiResponseNodes: any[],
): Record<string, number> {
  const updatedMap = { ...frequencyMap };

  if (!Array.isArray(apiResponseNodes)) {
    console.log(
      '⚠️  API response nodes is not an array:',
      typeof apiResponseNodes,
    );
    return updatedMap;
  }

  let foundBirthdates = 0;
  for (const node of apiResponseNodes) {
    // Handle metadata as array of {key, value} objects (current API format)
    if (Array.isArray(node?.metadata)) {
      const birthdateMetadata = node.metadata.find(
        (meta: any) => meta.key === 'birthDate',
      );
      if (birthdateMetadata?.value) {
        const birthDate = birthdateMetadata.value;
        updatedMap[birthDate] = (updatedMap[birthDate] || 0) + 1;
        foundBirthdates++;
      }
    }
    // Also handle legacy format in case metadata is an object
    else if (node?.metadata?.birthDate) {
      const birthDate = node.metadata.birthDate;
      updatedMap[birthDate] = (updatedMap[birthDate] || 0) + 1;
      foundBirthdates++;
    }
  }

  if (foundBirthdates > 0) {
    console.log(
      `📊 Found ${foundBirthdates} birthdates in batch of ${apiResponseNodes.length} nodes`,
    );
  }

  return updatedMap;
}

/**
 * Save birthdate frequency map to file
 */
function saveBirthdateFrequencyMap(
  filePath: string,
  frequencyMap: Record<string, number>,
): void {
  try {
    // Sort by frequency descending, then by birthdate
    const sortedEntries = Object.entries(frequencyMap).sort(
      ([a, countA], [b, countB]) => {
        if (countB !== countA) return countB - countA;
        return a.localeCompare(b);
      },
    );

    const output = {
      generatedAt: new Date().toISOString(),
      totalUniquesBirthdates: sortedEntries.length,
      totalRecords: sortedEntries.reduce((sum, [, count]) => sum + count, 0),
      frequencyMap: Object.fromEntries(sortedEntries),
      summary: sortedEntries.map(([birthDate, count]) => ({
        birthDate,
        count,
      })),
    };

    writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
    logger.info(
      colors.green(`📊 Birthdate frequency map saved to: ${filePath}`),
    );
  } catch (err) {
    logger.error(
      colors.red(`❌ Failed to save frequency map: ${(err as Error).message}`),
    );
  }
}

// ============================================================================
// FILTER FUNCTION
// ============================================================================

/**
 * Filter out records that already have birthDate in metadata or don't have a birthDate to process
 */
export async function filterRecord(
  record: Record<string, string>,
): Promise<boolean> {
  // Skip records that don't have a birthDate to process
  if (!record.birthDate || record.birthDate.trim() === '') {
    return false;
  }

  // Skip records that don't have valid identifiers (email or transcendID)
  const hasValidEmail = record.email && record.email.trim() !== '';
  const hasValidTranscendID =
    record.transcendID && record.transcendID.trim() !== '';

  if (!hasValidEmail && !hasValidTranscendID) {
    logger.warn(
      `⚠️  Skipping record without valid identifiers: ${JSON.stringify({
        email: record.email,
        transcendID: record.transcendID,
        birthDate: record.birthDate?.substring(0, 20) + '...',
      })}`,
    );
    return false;
  }

  // Skip records that already have birthDate in metadata
  if (record.metadata) {
    try {
      // Parse the metadata JSON string: "metadata": "{\"birthDate\":\"1972-01-01\"}"
      const metadata = JSON.parse(record.metadata);

      // If birthDate exists in metadata, skip this record (return false)
      if (metadata.birthDate) {
        return false;
      }
    } catch (err) {
      // If metadata is not valid JSON, log warning but continue processing
      logger.warn(
        `⚠️  Invalid metadata JSON for record: ${
          record.userId || record.email || 'unknown'
        }`,
      );
    }
  }

  // Include this record for processing
  return true;
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

/**
 * Transform CSV record into API payload format
 */
export async function transformRecord(
  record: Record<string, string>,
): Promise<Record<string, any>> {
  // Handle multiple comma-separated birthDates - parse each and find the lowest (earliest)
  let birthDate = '';
  if (record.birthDate?.trim()) {
    const birthDateStrings = record.birthDate
      .split(',')
      .map((date) => date.trim())
      .filter((date) => date);

    // Parse each date using the parseDate function to handle multiple formats
    const parsedDates: { dateObj: Date; originalStr: string }[] = [];

    for (const dateStr of birthDateStrings) {
      try {
        const dateObj = parseDate(dateStr);
        parsedDates.push({ dateObj, originalStr: dateStr });
      } catch (error) {
        logger.warn(`⚠️  Could not parse birth date "${dateStr}": ${error}`);
        // Continue with other dates
      }
    }

    // Find the lowest (earliest) birthdate
    if (parsedDates.length > 0) {
      const earliest = parsedDates.reduce((min, current) =>
        current.dateObj < min.dateObj ? current : min,
      );

      // Format as YYYY-MM-DD
      const year = earliest.dateObj.getUTCFullYear();
      const month = String(earliest.dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(earliest.dateObj.getUTCDate()).padStart(2, '0');
      birthDate = `${year}-${month}-${day}`;
    }
  }

  // Build identifiers array - prefer email over transcendID
  const identifiers: Array<{ name: string; value: string }> = [];
  if (record.email && record.email.trim() !== '') {
    identifiers.push({ name: 'email', value: record.email });
  } else if (record.transcendID && record.transcendID.trim() !== '') {
    identifiers.push({ name: 'transcendID', value: record.transcendID });
  }

  // Safety check: This should never happen due to filterRecord, but add as safeguard
  if (identifiers.length === 0) {
    throw new Error(
      `No valid identifiers found for record: ${JSON.stringify({
        email: record.email,
        transcendID: record.transcendID,
        partition: record.partition,
      })}`,
    );
  }

  // Build metadata array - only add birthDate
  const metadata: Array<{ key: string; value: string }> = [];

  // Add birthDate to metadata if it exists
  if (birthDate) {
    metadata.push({ key: 'birthDate', value: birthDate });
  }

  // Build the API payload - ensure all required fields are present
  return {
    partition: record.partition,
    timestamp: record.timestamp,
    identifiers,
    metadata,
  };
}

// ============================================================================
// STREAM COMPONENTS
// ============================================================================

/**
 * Filter Stream
 */
export class FilterStream extends Transform {
  private filterFn: (record: Record<string, string>) => Promise<boolean>;
  public stats: { total: number; passed: number; filtered: number };
  private maxRecords?: number;
  private totalProcessedSoFar: number;
  private resumeFromRecord: number;
  private recordsSkipped: number;

  constructor(
    filterFn: (record: Record<string, string>) => Promise<boolean>,
    maxRecords?: number,
    totalProcessedSoFar = 0,
    resumeFromRecord = 0,
  ) {
    super({ objectMode: true });
    this.filterFn = filterFn;
    this.maxRecords = maxRecords;
    this.totalProcessedSoFar = totalProcessedSoFar;
    this.resumeFromRecord = resumeFromRecord;
    this.recordsSkipped = 0;
    this.stats = {
      total: 0,
      passed: 0,
      filtered: 0,
    };
  }

  override async _transform(
    record: Record<string, string>,
    _encoding: string,
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    try {
      // Skip records if we're resuming from a checkpoint
      if (this.recordsSkipped < this.resumeFromRecord) {
        this.recordsSkipped++;
        callback();
        return;
      }

      // Check if we've hit the hard limit
      if (
        this.maxRecords &&
        this.totalProcessedSoFar + this.stats.total >= this.maxRecords
      ) {
        // Stop processing by ending the stream
        callback();
        this.push(null); // Signal end of stream
        return;
      }

      this.stats.total++;

      const shouldInclude = await this.filterFn(record);
      if (shouldInclude) {
        this.stats.passed++;
        this.push(record);
      } else {
        this.stats.filtered++;
      }

      callback();
    } catch (err) {
      callback(err as Error);
    }
  }
}

/**
 * Transform Stream
 */
export class TransformStream extends Transform {
  private transformFn: (
    record: Record<string, string>,
  ) => Promise<Record<string, any>>;
  public stats: { processed: number; transformed: number };

  constructor(
    transformFn: (
      record: Record<string, string>,
    ) => Promise<Record<string, any>>,
  ) {
    super({ objectMode: true });
    this.transformFn = transformFn;
    this.stats = {
      processed: 0,
      transformed: 0,
    };
  }

  override async _transform(
    record: Record<string, string>,
    _encoding: string,
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    try {
      this.stats.processed++;
      const transformed = await this.transformFn(record);

      if (transformed) {
        this.stats.transformed++;
        // Pass both transformed and original record for dry run logging
        this.push({ transformed, original: record });
      }

      callback();
    } catch (err) {
      callback(err as Error);
    }
  }
}

/**
 * Batch Upload Stream - collects records and uploads them in batches with backpressure
 */
/**
 * Batch Upload Stream - collects records and uploads them in batches with specific concurrency
 */
export class BatchUploadStream extends Writable {
  private batch: Array<{
    transformed: Record<string, any>;
    original: Record<string, string>;
  }>;
  private batchSize: number;
  private sombra!: Got; // Definite assignment assertion - initialized in constructor
  private dryRun: boolean;
  public stats: { uploaded: number; failed: number; batches: number };
  private onBatchComplete?: (batchStats: {
    uploaded: number;
    failed: number;
    batches: number;
  }) => void;
  private mainProgressBar?: cliProgress.SingleBar;
  private errorLogFile?: string;
  private birthdateFrequency: Record<string, number>;

  // Concurrency and Buffering controls
  private activeUploads: number;
  private maxConcurrency: number;

  // This queue holds full batches ready to be uploaded
  private batchQueue: Array<
    Array<{
      transformed: Record<string, any>;
      original: Record<string, string>;
    }>
  >;
  // How many full batches we allow in memory before pausing the file reader
  private maxPendingBatches: number;
  private streamResumeCallback: (() => void) | null;

  constructor(
    sombra: Got,
    batchSize = 100,
    dryRun = false,
    onBatchComplete?: (batchStats: {
      uploaded: number;
      failed: number;
      batches: number;
    }) => void,
    mainProgressBar?: cliProgress.SingleBar,
    errorLogFile?: string,
    concurrency = 3,
    birthdateFrequency: Record<string, number> = {},
  ) {
    super({ objectMode: true });

    this.batch = [];
    this.sombra = sombra;
    this.batchSize = batchSize;
    this.dryRun = dryRun;
    this.onBatchComplete = onBatchComplete;
    this.mainProgressBar = mainProgressBar;
    this.errorLogFile =
      errorLogFile ||
      `./failed-records-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.ndjson`;

    this.activeUploads = 0;
    this.maxConcurrency = concurrency;

    // BUFFERING CONFIGURATION
    this.batchQueue = [];
    // We allow (Concurrency * 2) batches to sit in memory waiting.
    // This ensures that when an upload finishes, the next batch is INSTANTLY ready.
    this.maxPendingBatches = concurrency * 2;

    this.streamResumeCallback = null;
    this.stats = {
      uploaded: 0,
      failed: 0,
      batches: 0,
    };
    this.birthdateFrequency = birthdateFrequency;

    // Log configuration
    logger.info(
      colors.blue(
        `\u26A1 Batch Stream Config: Buffer Size=${this.maxPendingBatches} batches, Concurrency=${concurrency}`,
      ),
    );
  }

  override async _write(
    record: {
      transformed: Record<string, any>;
      original: Record<string, string>;
    },
    _encoding: string,
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    try {
      this.batch.push(record);

      // If current building batch is not full, just keep reading
      if (this.batch.length < this.batchSize) {
        callback();
        return;
      }

      // === 1. BATCH IS FULL ===
      // Move the current batch into the queue
      const fullBatch = [...this.batch];
      this.batch = [];
      this.batchQueue.push(fullBatch);

      // === 2. TRIGGER UPLOADS ===
      // Try to start uploads if we have concurrency slots open
      this.processQueue();

      // === 3. MANAGE BACKPRESSURE ===
      // We only pause the stream if our buffer (queue) is too full.
      // This allows the file reader to run FASTER than the uploader,
      // preparing batches in advance.
      if (this.batchQueue.length < this.maxPendingBatches) {
        callback(); // Buffer is not full, keep reading from disk!
      } else {
        // Buffer is full. Pause reading from disk until we upload some batches.
        this.streamResumeCallback = callback;
      }
    } catch (err) {
      callback(err as Error);
    }
  }

  override async _final(
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    try {
      // If there is a partial batch left, add it to the queue
      if (this.batch.length > 0) {
        this.batchQueue.push(this.batch);
        this.batch = [];
      }

      // Process any remaining items
      this.processQueue();

      // Wait for everything to drain
      const waitForCompletion = () => {
        // We are done when:
        // 1. No uploads are active
        // 2. No batches are waiting in the queue
        if (this.activeUploads === 0 && this.batchQueue.length === 0) {
          callback();
        } else {
          setTimeout(waitForCompletion, 100);
        }
      };

      waitForCompletion();
    } catch (err) {
      callback(err as Error);
    }
  }

  /**
   * Checks the queue and concurrency limits to start new uploads
   */
  private processQueue(): void {
    // While we have batches waiting AND we have open slots...
    while (
      this.batchQueue.length > 0 &&
      this.activeUploads < this.maxConcurrency
    ) {
      const nextBatch = this.batchQueue.shift();
      if (nextBatch) {
        this.uploadBatch(nextBatch).then(() => {
          // Upload finished.
          // 1. Try to start the next upload immediately
          this.processQueue();

          // 2. Check if we should resume reading from disk
          if (
            this.streamResumeCallback &&
            this.batchQueue.length < this.maxPendingBatches
          ) {
            const resume = this.streamResumeCallback;
            this.streamResumeCallback = null;
            resume(); // Resume disk reading
          }
        });
      }
    }
  }

  private async uploadBatch(
    batchToUpload: Array<{
      transformed: Record<string, any>;
      original: Record<string, string>;
    }>,
  ): Promise<void> {
    this.activeUploads++;

    // Log concurrent status occasionally
    if (this.activeUploads > 1 && this.stats.batches % 5 === 0) {
      // Optional: Reduce log spam, or log every time
    }

    try {
      if (this.dryRun) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 + Math.random() * 200),
        );

        this.stats.uploaded += batchToUpload.length;
        this.stats.batches++;

        // Progress bar logic...
        if (this.mainProgressBar) {
          this.mainProgressBar.increment(batchToUpload.length);
        }

        if (this.onBatchComplete) this.onBatchComplete(this.stats);
        return;
      }

      // Real Upload Logic
      const transformedRecords = batchToUpload.map(
        (record) => record.transformed,
      );

      // Update progress bar mostly BEFORE request to show activity
      if (this.mainProgressBar) {
        this.mainProgressBar.increment(Math.floor(batchToUpload.length / 2));
      }

      const result = await this.sombra.put(`v1/preferences`, {
        json: { records: transformedRecords },
        responseType: 'json',
      });

      // Update birthdate frequency map from API response
      const responseNodes = (result as any).body?.nodes;
      if (responseNodes) {
        const beforeCount = Object.keys(this.birthdateFrequency).length;
        this.birthdateFrequency = updateBirthdateFrequency(
          this.birthdateFrequency,
          responseNodes,
        );
        const afterCount = Object.keys(this.birthdateFrequency).length;
        if (afterCount > beforeCount) {
          console.log(
            `🎯 Updated frequency map: ${beforeCount} -> ${afterCount} unique birthdates`,
          );
        }
      }

      // Update remaining progress
      if (this.mainProgressBar) {
        this.mainProgressBar.increment(
          batchToUpload.length - Math.floor(batchToUpload.length / 2),
        );
      }

      this.stats.uploaded += transformedRecords.length;
      this.stats.batches++;

      if (this.onBatchComplete) {
        this.onBatchComplete(this.stats);
      }
    } catch (err) {
      this.stats.failed += batchToUpload.length;

      // === ERROR LOGGING (Same as before) ===
      logger.error(
        colors.red(`   ❌ Batch upload failed: ${(err as Error).message}`),
      );

      const apiResponse =
        err instanceof Error && 'response' in err
          ? (err as any).response?.body
          : undefined;

      if (this.errorLogFile) {
        logFailedRecords(this.errorLogFile, batchToUpload, {
          batchNumber: this.stats.batches + 1,
          timestamp: new Date().toISOString(),
          errorMessage: (err as Error).message,
          apiResponse,
        });
      }
    } finally {
      this.activeUploads--;
      // Note: We do NOT call processQueue here anymore.
      // We rely on the .then() in processQueue to handle the flow control
      // to avoid 'this' context issues, although arrow functions handle it fine.
    }
  }

  /**
   * Get the current birthdate frequency map
   */
  getBirthdateFrequency(): Record<string, number> {
    return { ...this.birthdateFrequency };
  }
}

// ============================================================================
// PRE-FLIGHT ANALYSIS
// ============================================================================

/**
 * Pre-flight analysis: count and optionally cache records that need processing
 */
export async function preflightAnalysis(
  inputPath: string,
  outputTempPath?: string,
  maxRecords?: number,
  resumeFromRecord = 0,
): Promise<{
  totalRecords: number;
  recordsToProcess: number;
  recordsFiltered: number;
  tempFilePath?: string;
}> {
  // Silent per-file analysis

  const filterStream = new FilterStream(
    filterRecord,
    maxRecords,
    0,
    resumeFromRecord,
  );
  let tempWriteStream: any = null;
  let tempFilePath: string | undefined = undefined;

  // If temp output path provided, create write stream for filtered records
  if (outputTempPath) {
    tempFilePath = outputTempPath;
    tempWriteStream = createWriteStream(tempFilePath);

    // Add CSV headers
    const headers = [
      'email',
      'transcendID',
      'birthDate',
      'partition',
      'timestamp',
      'metadata',
    ];
    const csvStringifier = stringify({ header: true, columns: headers });
    csvStringifier.pipe(tempWriteStream);

    // Process filtered records through CSV stringifier
    filterStream.on('data', (record) => {
      csvStringifier.write({
        email: record.email || '',
        transcendID: record.transcendID || '',
        birthDate: record.birthDate || '',
        partition: record.partition || '',
        timestamp: record.timestamp || '',
        metadata: record.metadata || '',
      });
    });

    filterStream.on('end', () => {
      csvStringifier.end();
    });
  }

  // Create CSV parser
  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  try {
    // Stream through the file
    await streamPipeline(
      createReadStream(inputPath),
      parser,
      filterStream,
      ...(tempWriteStream ? [] : []), // Only add temp stream if we're caching
    );

    const stats = filterStream.stats;

    // Silent completion - only log errors if needed

    return {
      totalRecords: stats.total,
      recordsToProcess: stats.passed,
      recordsFiltered: stats.filtered,
      tempFilePath,
    };
  } catch (err) {
    logger.error(
      colors.red(`❌ Pre-flight analysis failed: ${(err as Error).message}`),
    );
    throw err;
  }
}

/**
 * Run pre-flight analysis across all files to get accurate counts
 */
export async function preflightAllFiles(
  chunksDir: string,
  outputDir: string,
  maxRecords?: number,
  resumeFromCheckpoint?: CheckpointData,
): Promise<{
  totalFiles: number;
  totalRecords: number;
  recordsToProcess: number;
  recordsFiltered: number;
  fileAnalysis: Array<{
    file: string;
    totalRecords: number;
    recordsToProcess: number;
    recordsFiltered: number;
    tempFilePath?: string;
  }>;
}> {
  // Get all CSV files
  const files = readdirSync(chunksDir)
    .filter((f) => f.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    throw new Error('No CSV files found in chunks directory');
  }

  // Filter files based on checkpoint if resuming
  let filesToAnalyze = files;
  let startFileIndex = 0;
  let totalProcessedSoFar = 0;

  if (resumeFromCheckpoint) {
    startFileIndex = resumeFromCheckpoint.currentFileIndex;
    totalProcessedSoFar = resumeFromCheckpoint.totalProcessedRecords;

    // Skip completed files
    filesToAnalyze = files
      .slice(startFileIndex)
      .filter((file) => !resumeFromCheckpoint.completedFiles.includes(file));

    // If we're in the middle of processing the current file, include it
    if (
      filesToAnalyze.length === 0 &&
      resumeFromCheckpoint.currentFile &&
      !resumeFromCheckpoint.completedFiles.includes(
        resumeFromCheckpoint.currentFile,
      )
    ) {
      filesToAnalyze.unshift(resumeFromCheckpoint.currentFile);
    }
  }

  // Silent analysis of files

  const fileAnalysis: Array<{
    file: string;
    totalRecords: number;
    recordsToProcess: number;
    recordsFiltered: number;
    tempFilePath?: string;
  }> = [];

  let totalRecords = 0;
  let recordsToProcess = 0;
  let recordsFiltered = 0;

  // Analyze each file
  for (let i = 0; i < filesToAnalyze.length; i++) {
    const file = filesToAnalyze[i];
    const inputPath = join(chunksDir, file);

    // Check if we've hit max records limit
    if (maxRecords && totalProcessedSoFar >= maxRecords) {
      logger.info(
        colors.yellow(`⏹️  Stopping pre-flight: reached max records limit`),
      );
      break;
    }

    // Calculate resume point for this file
    const resumeFromRecord =
      resumeFromCheckpoint?.currentFile === file
        ? resumeFromCheckpoint.recordsProcessedInCurrentFile
        : 0;

    // Create temp file path for caching filtered records
    const tempFilePath = join(outputDir, `temp-filtered-${file}`);

    try {
      const analysis = await preflightAnalysis(
        inputPath,
        tempFilePath,
        maxRecords ? maxRecords - totalProcessedSoFar : undefined,
        resumeFromRecord,
      );

      fileAnalysis.push({
        file,
        ...analysis,
      });

      totalRecords += analysis.totalRecords;
      recordsToProcess += analysis.recordsToProcess;
      recordsFiltered += analysis.recordsFiltered;
      totalProcessedSoFar += analysis.totalRecords;
    } catch (err) {
      logger.error(
        colors.red(`❌ Failed to analyze ${file}: ${(err as Error).message}`),
      );
      // Continue with other files
      fileAnalysis.push({
        file,
        totalRecords: 0,
        recordsToProcess: 0,
        recordsFiltered: 0,
      });
    }
  }

  logger.info(
    colors.green(
      `\n✅ Pre-flight complete: ${recordsToProcess.toLocaleString()} records to process (${recordsFiltered.toLocaleString()} filtered out)`,
    ),
  );

  return {
    totalFiles: files.length,
    totalRecords,
    recordsToProcess,
    recordsFiltered,
    fileAnalysis,
  };
}

// ============================================================================
// PROCESS SINGLE FILE
// ============================================================================

/**
 * Process a single CSV file
 */
export async function processChunkFile(
  inputPath: string,
  sombra: Got,
  dryRun: boolean,
  maxRecords?: number,
  totalProcessedSoFar = 0,
  resumeFromRecord = 0,
  onProgress?: (recordsProcessed: number) => void,
  mainProgressBar?: cliProgress.SingleBar,
  errorLogFile?: string,
  batchSize = 500,
  concurrency = 3,
  birthdateFrequency: Record<string, number> = {},
): Promise<{
  success: boolean;
  filterStats: { total: number; passed: number; filtered: number };
  transformStats: { processed: number; transformed: number };
  uploadStats: { uploaded: number; failed: number; batches: number };
  birthdateFrequency: Record<string, number>;
  error?: Error;
}> {
  logger.info(colors.blue(`📄 Processing ${basename(inputPath)}...`));

  const filterStream = new FilterStream(
    filterRecord,
    maxRecords,
    totalProcessedSoFar,
    resumeFromRecord,
  );
  const transformStream = new TransformStream(transformRecord);

  // Create upload stream with progress callback
  let recordsProcessedInBatches = resumeFromRecord;
  const uploadStream = new BatchUploadStream(
    sombra,
    batchSize,
    dryRun,
    (batchStats) => {
      recordsProcessedInBatches += batchSize; // Approximate, could be more precise
      if (onProgress) {
        onProgress(recordsProcessedInBatches);
      }
    },
    mainProgressBar,
    errorLogFile,
    concurrency,
    birthdateFrequency,
  );

  try {
    // Process pre-filtered file directly - no filtering needed
    await streamPipeline(
      createReadStream(inputPath),
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }),
      transformStream,
      uploadStream,
    );

    // Get stats from pre-filtered processing
    const filterStats = {
      total: transformStream.stats.processed,
      passed: transformStream.stats.processed,
      filtered: 0, // Filtering already done during pre-flight
    };
    const transformStats = transformStream.stats;
    const uploadStats = uploadStream.stats;

    logger.info(
      colors.green(
        `   ✅ Uploaded ${uploadStats.uploaded} records in ${uploadStats.batches} batches`,
      ),
    );

    return {
      success: true,
      filterStats,
      transformStats,
      uploadStats,
      birthdateFrequency: uploadStream.getBirthdateFrequency(),
    };
  } catch (err) {
    logger.error(
      colors.red(
        `   ❌ Error processing ${inputPath}: ${(err as Error).message}`,
      ),
    );
    return {
      success: false,
      filterStats: filterStream.stats,
      transformStats: transformStream.stats,
      uploadStats: uploadStream.stats,
      birthdateFrequency: uploadStream.getBirthdateFrequency(),
      error: err as Error,
    };
  }
}

// ============================================================================
// MAIN IMPLEMENTATION
// ============================================================================

export async function birthdateMigration(
  this: LocalContext,
  {
    auth,
    sombraAuth,
    transcendUrl,
    chunksDir,
    outputDir,
    dryRun,
    maxRecords,
    checkpointFile = join(outputDir, 'migration-checkpoint.json'),
    resume = false,
    checkpointInterval = 1000,
    batchSize = 500,
    concurrency = 3,
    frequencyMapFile,
  }: BirthdateMigrationCommandFlags,
): Promise<void> {
  logger.info(colors.magenta('🚀 BirthDate Migration'));
  logger.info(colors.cyan(`📂 Input directory: ${chunksDir}`));
  logger.info(colors.cyan(`📂 Output directory: ${outputDir}`));
  logger.info(colors.cyan(`💾 Checkpoint file: ${checkpointFile}`));
  logger.info(colors.cyan(`⚡ Upload concurrency: ${concurrency} batches`));

  // Create error log file path
  const errorLogFile = join(outputDir, 'failed-records.ndjson');
  logger.info(colors.cyan(`📋 Error log file: ${errorLogFile}`));

  // Create frequency map file path
  const birthdateFrequencyFile = frequencyMapFile;
  logger.info(colors.cyan(`📊 Frequency map file: ${birthdateFrequencyFile}`));

  if (maxRecords) {
    logger.info(
      colors.yellow(`⚠️  Max records limit: ${maxRecords} (for testing)`),
    );
  }

  if (resume) {
    logger.info(colors.blue(`🔄 Resume mode enabled`));
  }

  logger.info('');

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Get all CSV files from chunks directory
  const files = readdirSync(chunksDir)
    .filter((f) => f.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    logger.error(colors.red('❌ No CSV files found in chunks directory'));
    return;
  }

  logger.info(
    colors.magenta(`📋 Found ${files.length} CSV files to process\n`),
  );

  // Load or initialize checkpoint
  let checkpoint: CheckpointData | null = null;
  if (resume) {
    checkpoint = loadCheckpoint(checkpointFile);
  }

  if (!checkpoint) {
    checkpoint = initializeCheckpoint(files);
    logger.info(
      colors.blue('📝 Starting fresh migration (no checkpoint found)'),
    );
  } else {
    logger.info(
      colors.green(
        `📂 Resuming from checkpoint - already processed ${checkpoint.totalStats.totalUploaded} records`,
      ),
    );
  }

  // Create Sombra client
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Always run pre-flight analysis for accurate progress and filtering
  logger.info(colors.magenta('\n🔍 Analyzing files...'));
  const preflightResults = await preflightAllFiles(
    chunksDir,
    outputDir,
    maxRecords,
    checkpoint,
  );

  const results: Array<{
    file: string;
    success: boolean;
    filterStats: { total: number; passed: number; filtered: number };
    transformStats: { processed: number; transformed: number };
    uploadStats: { uploaded: number; failed: number; batches: number };
    error?: Error;
  }> = [];

  let totalProcessedRecords = checkpoint.totalProcessedRecords;
  let recordsProcessedSinceLastCheckpoint = 0;

  // Start from the correct file index if resuming
  const startFileIndex = checkpoint.currentFileIndex;
  const filesToProcess = files.slice(startFileIndex);

  // Skip completed files
  const remainingFiles = filesToProcess.filter(
    (file) => !checkpoint!.completedFiles.includes(file),
  );

  if (
    remainingFiles.length === 0 &&
    checkpoint.currentFile &&
    !checkpoint.completedFiles.includes(checkpoint.currentFile)
  ) {
    // We're in the middle of processing the current file
    remainingFiles.unshift(checkpoint.currentFile);
  }

  // Use accurate count from pre-flight analysis
  const totalRecordsToProcess = preflightResults.recordsToProcess;

  // Create main progress bar
  const mainProgressBar = new cliProgress.SingleBar({
    format:
      'Progress |{bar}| {percentage}% | {value}/{total} records | ETA: {eta}s',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
    stopOnComplete: false,
  });

  mainProgressBar.start(
    totalRecordsToProcess,
    checkpoint.totalStats.totalUploaded,
  );
  let filesProcessed = checkpoint.completedFiles.length;

  // Process each temp file created during pre-flight analysis
  for (let i = 0; i < preflightResults.fileAnalysis.length; i++) {
    const fileAnalysis = preflightResults.fileAnalysis[i];
    const file = fileAnalysis.file;
    const fileIndex = startFileIndex + i;

    // Skip files that don't have records to process
    if (fileAnalysis.recordsToProcess === 0) {
      logger.info(colors.gray(`⏭️  Skipping ${file} (no records to process)`));
      continue;
    }

    // Check if we've hit the max records limit
    if (maxRecords && totalProcessedRecords >= maxRecords) {
      logger.info(
        colors.yellow(
          `\n⏹️  Stopping: reached max records limit of ${maxRecords}`,
        ),
      );
      break;
    }

    // Use temp file with filtered records instead of original file
    const inputPath = fileAnalysis.tempFilePath || join(chunksDir, file);
    const resumeFromRecord =
      file === checkpoint.currentFile
        ? checkpoint.recordsProcessedInCurrentFile
        : 0;

    if (resumeFromRecord > 0) {
      logger.info(
        colors.blue(`🔄 Resuming file ${file} from record ${resumeFromRecord}`),
      );
    }

    // Progress callback for checkpointing
    const onProgress = (recordsProcessed: number) => {
      recordsProcessedSinceLastCheckpoint++;

      if (recordsProcessedSinceLastCheckpoint >= checkpointInterval) {
        checkpoint = updateCheckpoint(
          checkpoint!,
          file,
          fileIndex,
          recordsProcessed,
          totalProcessedRecords + recordsProcessed,
        );

        saveCheckpoint(checkpointFile, checkpoint);
        recordsProcessedSinceLastCheckpoint = 0;
      }
    };

    const result = await processChunkFile(
      inputPath,
      sombra,
      dryRun,
      maxRecords,
      totalProcessedRecords,
      resumeFromRecord,
      onProgress,
      mainProgressBar,
      errorLogFile,
      batchSize,
      concurrency,
      checkpoint.birthdateFrequency,
    );

    // Update files processed counter
    filesProcessed++;

    results.push({
      file,
      ...result,
    });

    // Update checkpoint after file completion
    checkpoint = updateCheckpoint(
      checkpoint,
      file,
      fileIndex,
      0, // Reset records in current file since it's completed
      totalProcessedRecords + result.filterStats.total,
      true, // File completed
      result,
    );

    // Save checkpoint after each file
    saveCheckpoint(checkpointFile, checkpoint);

    // Track total processed records across all files
    totalProcessedRecords += result.filterStats.total;

    if (!result.success) {
      logger.error(
        colors.red(`❌ Failed processing: ${result.error?.message}`),
      );
    }
  }

  // Summary
  logger.info(colors.magenta('\n' + '='.repeat(60)));
  logger.info(colors.magenta('📊 SUMMARY'));
  logger.info(colors.magenta('='.repeat(60)));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  logger.info(colors.green(`✅ Successful: ${successful.length}`));
  if (failed.length > 0) {
    logger.info(colors.red(`❌ Failed: ${failed.length}`));
  }

  if (successful.length > 0 || checkpoint.totalStats.totalUploaded > 0) {
    const sessionFiltered = successful.reduce(
      (sum, r) => sum + r.filterStats.filtered,
      0,
    );
    const sessionPassed = successful.reduce(
      (sum, r) => sum + r.filterStats.passed,
      0,
    );
    const sessionTransformed = successful.reduce(
      (sum, r) => sum + r.transformStats.transformed,
      0,
    );
    const sessionUploaded = successful.reduce(
      (sum, r) => sum + r.uploadStats.uploaded,
      0,
    );
    const sessionBatches = successful.reduce(
      (sum, r) => sum + r.uploadStats.batches,
      0,
    );

    // Combine session stats with checkpoint totals
    const totalFiltered = checkpoint.totalStats.totalFiltered + sessionFiltered;
    const totalPassed = checkpoint.totalStats.totalPassed + sessionPassed;
    const totalTransformed =
      checkpoint.totalStats.totalTransformed + sessionTransformed;
    const totalUploaded = checkpoint.totalStats.totalUploaded + sessionUploaded;
    const totalBatches = checkpoint.totalStats.totalBatches + sessionBatches;

    logger.info(
      colors.cyan(`\n📈 Total records (including previous sessions):`),
    );
    logger.info(colors.cyan(`   Processed: ${totalFiltered + totalPassed}`));
    logger.info(colors.cyan(`   Passed filter: ${totalPassed}`));
    logger.info(colors.cyan(`   Filtered out: ${totalFiltered}`));
    logger.info(colors.cyan(`   Transformed: ${totalTransformed}`));
    logger.info(
      colors.cyan(`   Uploaded: ${totalUploaded} in ${totalBatches} batches`),
    );

    if (sessionUploaded > 0) {
      logger.info(colors.blue(`\n📊 This session:`));
      logger.info(
        colors.blue(`   Processed: ${sessionFiltered + sessionPassed}`),
      );
      logger.info(
        colors.blue(
          `   Uploaded: ${sessionUploaded} in ${sessionBatches} batches`,
        ),
      );
    }
  }

  if (failed.length > 0) {
    logger.info(colors.red(`\n❌ Failed files:`));
    failed.forEach((r) => logger.error(colors.red(`   - ${r.file}`)));
  }

  // Mark migration as complete if all files processed successfully
  const allFilesCompleted =
    checkpoint && checkpoint.completedFiles
      ? files.every((file) => checkpoint?.completedFiles.includes(file))
      : false;

  if (allFilesCompleted && failed.length === 0) {
    logger.info(colors.green('\n🎉 Migration completed successfully!'));

    // Archive the checkpoint file
    const completedCheckpointFile = checkpointFile.replace(
      '.json',
      '-completed.json',
    );
    try {
      writeFileSync(
        completedCheckpointFile,
        JSON.stringify(
          {
            ...checkpoint,
            completedAt: new Date().toISOString(),
            status: 'completed',
          },
          null,
          2,
        ),
        'utf8',
      );

      // Remove active checkpoint file
      if (existsSync(checkpointFile)) {
        require('node:fs').unlinkSync(checkpointFile);
      }

      logger.info(
        colors.blue(`📁 Checkpoint archived to: ${completedCheckpointFile}`),
      );
    } catch (err) {
      logger.warn(
        colors.yellow(
          `⚠️  Could not archive checkpoint: ${(err as Error).message}`,
        ),
      );
    }
  } else if (failed.length > 0) {
    logger.error(
      colors.red(
        '\n❌ Migration completed with errors. Use --resume to retry failed files.',
      ),
    );
  } else {
    logger.info(
      colors.blue(
        '\n⏸️  Migration paused. Use --resume to continue from checkpoint.',
      ),
    );
  }

  // Stop progress bar
  mainProgressBar.stop();

  // Save final birthdate frequency map
  const frequencyCount = checkpoint
    ? Object.keys(checkpoint.birthdateFrequency).length
    : 0;
  logger.info(
    colors.cyan(`\n📊 Frequency map has ${frequencyCount} unique birthdates`),
  );

  if (checkpoint && frequencyCount > 0) {
    logger.info(colors.blue('📊 Saving final birthdate frequency map...'));
    saveBirthdateFrequencyMap(
      birthdateFrequencyFile,
      checkpoint.birthdateFrequency,
    );
  } else {
    logger.info(colors.yellow('⚠️  No birthdate frequency data to save'));
    if (checkpoint) {
      logger.info(
        colors.gray(
          `Debug: checkpoint.birthdateFrequency = ${JSON.stringify(
            checkpoint.birthdateFrequency,
          )}`,
        ),
      );
    }
  }

  // Cleanup temp files from pre-flight analysis
  logger.info(colors.blue('\n🧹 Cleaning up temporary files...'));
  let cleanupCount = 0;
  for (const fileAnalysis of preflightResults.fileAnalysis) {
    if (fileAnalysis.tempFilePath && existsSync(fileAnalysis.tempFilePath)) {
      try {
        require('node:fs').unlinkSync(fileAnalysis.tempFilePath);
        cleanupCount++;
      } catch (err) {
        logger.warn(
          colors.yellow(
            `⚠️  Could not delete temp file ${fileAnalysis.tempFilePath}: ${
              (err as Error).message
            }`,
          ),
        );
      }
    }
  }
  if (cleanupCount > 0) {
    logger.info(colors.green(`✅ Cleaned up ${cleanupCount} temporary files`));
  }

  logger.info(colors.magenta('\n✨ Done!'));
}
