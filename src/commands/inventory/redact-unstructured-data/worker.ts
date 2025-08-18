import type { ToWorker } from '../../../lib/pooling';
import { logger } from '../../../logger';
import { readFile, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { type Got, type HTTPError } from 'got';
import { extractErrorMessage } from '../../../lib/helpers';
import {
  createSombraGotInstance,
  type DataSubCategory,
} from '../../../lib/graphql';

/**
 * A single file classification/redaction task sent to this worker.
 */
export type UnstructuredTask = {
  /** Absolute or relative path of the UTF-8 text file to classify/redact. */
  filePath: string;
  options: {
    /** Root of input tree; used to mirror folder structure into outputDir. */
    baseInputDir: string;
    /** Root of output tree; file paths are mirrored under this directory. */
    outputDir: string;

    /** Transcend/Sombra base URL, e.g. https://api.transcend.io or https://sombra… */
    transcendUrl: string;
    /** Bearer token for Authorization header. */
    auth: string;
    /** Optional Sombra auth header (x-sombra-authorization). */
    sombraAuth?: string;

    /** Data categories to classify for (used as labels). */
    dataCategories: DataSubCategory[];

    /** How many paragraphs to classify per HTTP request. */
    batchSize: number;

    /** If true, also write a compact .redaction.json sidecar. */
    writeSidecar: boolean;
  };
};

/**
 * Periodic progress snapshot emitted by the worker.
 */
export type UnstructuredProgress = {
  /** The file currently being processed. */
  filePath: string;
  /** Bytes processed so far (approximate; based on chunk lengths). */
  processedBytes?: number;
  /** Incremental number of redactions detected since previous tick. */
  redactionsDelta?: number;
  /** Total bytes in the input file. */
  totalBytes?: number;
};

/**
 * Final result payload emitted by the worker when a task completes or fails.
 */
export type UnstructuredResult = {
  ok: boolean;
  filePath: string;
  error?: string;
};

/**
 * One Named-Entity-Recognition hit from the classifier.
 */
type NerHit = {
  /** Category label (e.g., "Contact: Email"). */
  type: string;
  /** Classifier confidence (0..1). */
  confidence: number;
  /** Optional classifier metadata. */
  classificationMethod?: string;
  /** Optional classifier version. */
  classifierVersion?: string;
  /** Matched literal value in the text (exact substring). */
  value: string;
  /** Optional short snippet for context. */
  snippet?: string;
};

/** API returns an array of hits for each input string. */
type NerResponse = {
  guesses: NerHit[][];
};

/**
 * Split a UTF-8 text buffer into paragraphs using blank lines as boundaries.
 *
 * We classify/redact by paragraph to improve precision and control payload size.
 *
 * @param text - The input text to split into paragraphs.
 * @returns An array of paragraphs (strings).
 */
function splitIntoParagraphs(text: string): string[] {
  const parts = text.split(/\r?\n\s*\r?\n/);
  return parts.length ? parts : [text];
}

/**
 * Build a deterministic replacement token for a (type, value) pair.
 * Example: "__PD_EMAIL_1a2b3c4d__"
 *
 * @param type - The data category type (e.g., "Contact: Email").
 * @param value - The matched literal value (e.g., "example@example.com").
 * @returns A stable token string.
 */
function stableToken(type: string, value: string): string {
  const typeSlug = type.replace(/\W+/g, '_').toUpperCase();
  const hash8 = createHash('sha1').update(value).digest('hex').slice(0, 8);
  return `<<<${typeSlug}_${hash8}>>>`;
}

/**
 * Escape a literal string for use in a RegExp.
 *
 * @param value - The string to escape
 * @returns The escaped string suitable for RegExp use
 */
function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Join redacted paragraphs back together with the original spacing.
 *
 * @param chunks - The array of redacted paragraphs
 * @returns The joined string with double newlines between paragraphs
 */
function joinParagraphs(chunks: string[]): string {
  return chunks.join('\n\n');
}

/**
 * POST a batch of inputs to Sombra's unstructured classifier endpoint with retries.
 *
 * @param opts - The options for the batch classification
 * @returns The classification results
 */
async function classifyBatch(opts: {
  sombra: Got;
  inputs: string[];
  labels: string[];
}): Promise<NerResponse> {
  const { sombra, inputs, labels } = opts;

  const res = await sombra
    .post('classify/unstructured-text', {
      json: { inputList: inputs, labels },
      retry: {
        limit: 3,
        methods: ['POST'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        calculateDelay: ({ attemptCount, error, computedValue }) => {
          // Respect Retry-After if present
          const ra = Number(
            (error as HTTPError | undefined)?.response?.headers?.[
              'retry-after'
            ],
          );
          if (Number.isFinite(ra) && ra > 0) return ra * 1000;
          return computedValue ?? Math.min(2000 * attemptCount, 10_000);
        },
      },
      timeout: { request: 60_000 },
    })
    .json<NerResponse>();
  return res;
}

/**
 * Convert hrtime bigint to a friendly milliseconds number.
 *
 * @param startNs - The start time in hrtime bigint format
 * @returns The elapsed time in milliseconds
 */
function msSince(startNs: bigint): number {
  const deltaNs = process.hrtime.bigint() - startNs;
  return Number(deltaNs / 1_000_000n);
}

/**
 * The worker entrypoint. Listens for "task" messages, performs classification
 * and redaction, mirrors output paths, and emits progress + final result.
 */
export async function runChild(): Promise<void> {
  const workerId = Number(process.env.WORKER_ID || '0');

  logger.info(`[unstructured:w${workerId}] worker online (pid=${process.pid})`);
  process.send?.({ type: 'ready' });

  process.on('message', async (msg: ToWorker<UnstructuredTask>) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'shutdown') process.exit(0);
    if (msg.type !== 'task') return;

    const startedNs = process.hrtime.bigint();

    const { filePath, options } = msg.payload;
    const {
      baseInputDir,
      outputDir,
      transcendUrl,
      auth,
      sombraAuth,
      dataCategories,
      batchSize,
      writeSidecar,
    } = options;

    // Prepare client (this may validate tokens and normalize the base URL)
    const sombra = await createSombraGotInstance(
      transcendUrl,
      auth,
      sombraAuth,
    );

    const labelStrings = dataCategories.map((cat) => cat.name).filter((x) => x);

    logger.info(
      `[unstructured:w${workerId}] START file="${filePath}" labels=${labelStrings.length} batchSize=${batchSize}`,
    );

    try {
      const absPath = resolve(filePath);
      const raw = await readFile(absPath, 'utf8');
      const totalBytes = Buffer.byteLength(raw, 'utf8');

      // Initial progress snapshot
      process.send?.({
        type: 'progress',
        payload: { filePath, totalBytes } as UnstructuredProgress,
      });

      // Split to improve precision & keep requests bounded
      const chunks = splitIntoParagraphs(raw);
      logger.info(
        `[unstructured:w${workerId}] Read ${totalBytes.toLocaleString()}B; ${
          chunks.length
        } paragraph(s)`,
      );

      // Running tallies for granular progress logging
      const redactedChunks: string[] = [];
      const matchesPerChunk: NerHit[][] = [];
      let totalRedactions = 0;
      let processedBytes = 0;

      // Classify in batches
      let batchIndex = 0;
      const classifyStartedNs = process.hrtime.bigint();

      while (batchIndex < chunks.length) {
        const sliceStart = batchIndex;
        const batch = chunks.slice(batchIndex, batchIndex + batchSize);

        const httpStartNs = process.hrtime.bigint();
        let results: NerHit[][] = [];
        try {
          const raw = await classifyBatch({
            sombra,
            inputs: batch,
            labels: labelStrings,
          });
          results = raw.guesses;
        } catch (e) {
          // Expand HTTP error detail when available
          const httpErr = e as HTTPError;
          const bodySnippet =
            (httpErr?.response?.body &&
              String(httpErr.response.body).slice(0, 300)) ||
            '';
          throw new Error(
            `classifyBatch failed (batch ${sliceStart}..${
              sliceStart + batch.length - 1
            }; ` +
              `http=${httpErr?.response?.statusCode ?? 'n/a'}; ${msSince(
                httpStartNs,
              )}ms): ${extractErrorMessage(e)} ${
                bodySnippet ? `| body: ${bodySnippet}…` : ''
              }`,
          );
        }

        if (!Array.isArray(results) || results.length !== batch.length) {
          logger.warn(
            `[unstructured:w${workerId}] WARN: result size mismatch for batch starting at ${sliceStart}. ` +
              `got=${
                Array.isArray(results) ? results.length : 'non-array'
              } expected=${batch.length}`,
          );
        }

        // Process each paragraph in the batch
        for (let j = 0; j < batch.length; j += 1) {
          const original = batch[j] ?? '';
          const byteLen = Buffer.byteLength(original, 'utf8');
          const hits = Array.isArray(results) ? results[j] ?? [] : [];

          matchesPerChunk.push(hits);

          // Replace literal matches with stable tokens
          let redacted = original;
          let redactionsThisChunk = 0;

          for (const hit of hits) {
            // eslint-disable-next-line no-continue
            if (!hit?.value || !hit?.type) continue;
            const token = stableToken(hit.type, hit.value);
            const safe = escapeForRegex(hit.value);
            const before = redacted;
            redacted = redacted.replace(new RegExp(safe, 'g'), token);
            if (redacted !== before) redactionsThisChunk += 1;
          }

          totalRedactions += redactionsThisChunk;
          redactedChunks.push(redacted);

          processedBytes += byteLen;
          // Emit a lightweight progress tick per paragraph (cheap)
          process.send?.({
            type: 'progress',
            payload: {
              filePath,
              processedBytes,
              redactionsDelta: redactionsThisChunk,
            } as UnstructuredProgress,
          });
        }

        logger.info(
          `[unstructured:w${workerId}] Batch ${sliceStart}-${
            sliceStart + batch.length - 1
          } ` +
            `OK (${msSince(
              httpStartNs,
            )}ms). redactions+=${totalRedactions.toLocaleString()}`,
        );

        batchIndex += batch.length;
      }

      logger.info(
        `[unstructured:w${workerId}] Classified ${
          chunks.length
        } paragraph(s) in ${msSince(classifyStartedNs)}ms. ` +
          `Total redactions=${totalRedactions.toLocaleString()}`,
      );

      const redacted = joinParagraphs(redactedChunks);

      // Mirror directory under outputDir
      const relDir = relative(baseInputDir, dirname(absPath));
      const outDir = resolve(join(outputDir, relDir || ''));
      mkdirSync(outDir, { recursive: true });

      const fileName = absPath.split('/').pop()!;
      const outPath = resolve(join(outDir, `${fileName}.redacted`));
      await writeFile(outPath, redacted, 'utf8');

      logger.info(
        `[unstructured:w${workerId}] Wrote redacted file: ${outPath} (${processedBytes.toLocaleString()}/${totalBytes.toLocaleString()}B)`,
      );

      if (writeSidecar) {
        const sidecarPath = resolve(`${outPath}.redaction.json`);
        const sidecar = {
          file: absPath,
          outFile: outPath,
          totalRedactions,
          labels: labelStrings,
          matches: matchesPerChunk.map((arr) =>
            arr.map((m) => ({
              type: m.type,
              value: m.value,
              confidence: m.confidence,
              snippet: m.snippet,
            })),
          ),
        };
        await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf8');
        logger.info(
          `[unstructured:w${workerId}] Wrote sidecar: ${sidecarPath} (labels=${labelStrings.length})`,
        );
      }

      const totalMs = msSince(startedNs);
      logger.info(
        `[unstructured:w${workerId}] DONE file="${filePath}" ` +
          `bytes=${totalBytes.toLocaleString()} paragraphs=${
            chunks.length
          } redactions=${totalRedactions.toLocaleString()} ` +
          `in ${totalMs}ms`,
      );

      process.send?.({
        type: 'result',
        payload: { ok: true, filePath } as UnstructuredResult,
      });
    } catch (err) {
      // Expand error message with context
      const message = extractErrorMessage(err);
      logger.error(
        `[unstructured:w${workerId}] ERROR file="${filePath}": ${
          message || (err as Error)?.stack || err
        }`,
      );
      process.send?.({
        type: 'result',
        payload: { ok: false, filePath, error: message } as UnstructuredResult,
      });
    }
  });

  // Keep the worker alive until the parent kills it.
  await new Promise<never>(() => {
    // This is a no-op; we just need to keep the event loop running.
  });
}
