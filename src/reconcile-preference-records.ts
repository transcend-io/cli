#!/usr/bin/env node
/* eslint-disable max-len */
/* eslint-disable jsdoc/require-description,jsdoc/require-returns,jsdoc/require-param-description,@typescript-eslint/no-explicit-any,max-lines,no-continue,no-loop-func,no-param-reassign */

import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';
import cliProgress from 'cli-progress';

import { chunk, uniqBy } from 'lodash-es';
import type { Got } from 'got';
import type { Options as CsvParseOptions } from 'csv-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';
import * as t from 'io-ts';

import { decodeCodec } from '@transcend-io/type-utils';
import { logger } from './logger';
import { createSombraGotInstance } from './lib/graphql';
import { getPreferencesForIdentifiers } from './lib/preference-management';

import Bluebird from 'bluebird';
// import { extractErrorMessage } from './lib/helpers';

const { map } = Bluebird;

/**
 *
 */
type Identifier = {
  /** */ name: string /** */;
  /** */
  value: string;
};

/**
 *
 */
type PreferenceRecord = {
  /** */
  identifiers?: Identifier[];
  /** */
  purposes?: Array<{
    /** */
    purpose: string;
    /** */
    enabled: boolean;
    /** */
    preferences?: Array<{
      /** */
      topic?: string;
      /** */
      choice?: unknown;
    }>;
  }>;
  [k: string]: unknown;
};

/**
 *
 */
type Options = {
  /** */
  in: string;
  /** */
  partition: string;
  /** */
  batchSize: number;
  /** */
  downloadLogInterval: number;
  /** */
  transcendUrl: string;
  /** */
  transcendApiKey: string;
  /** */
  sombraApiKey?: string;
};

/**
 *
 * @param pathToFile
 * @param codec
 * @param options
 */
export function readCsv<T extends t.Any>(
  pathToFile: string,
  codec: T,
  options: CsvParseOptions = {},
): t.TypeOf<T>[] {
  const fileContent = parseCsvSync(fs.readFileSync(pathToFile, 'utf-8'), {
    columns: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
    ...options,
  });

  const data = decodeCodec(t.array(codec), fileContent);

  const parsed = data.map((datum) =>
    Object.entries(datum).reduce(
      (acc, [key, value]) =>
        Object.assign(acc, {
          [key.replace(/[^a-z_.+\-A-Z -~]/g, '')]: value,
        }),
      {} as any,
    ),
  );

  return parsed as any;
}

const OutRowCodec = t.intersection([
  t.type({
    personID: t.string,
    transcendID: t.string,
    email_withheld: t.string,
  }),
  t.record(t.string, t.unknown),
]);

/**
 *
 */
type OutRow = t.TypeOf<typeof OutRowCodec>;

/**
 *
 */
type RowMetrics = {
  /** */
  lookupBy: 'transcendID' | 'personID';
  /** */
  lookupValue: string;

  /** Total records AFTER unique-by-fingerprint */
  totalRecords: number;

  /** Total records BEFORE unique-by-fingerprint */
  totalRecordsRaw: number;

  /** */
  email: string;
  /** */
  emailCount: number;
  /** */
  multiEmail: boolean;

  /** */
  distinctVariants: number;
  /** */
  largestVariantCount: number;
  /** */
  identicalRecordCount: number;
  /** */
  allIdentical: boolean;

  /** */
  isDuplicateRow: boolean;
  /** */
  dupOfRowIndex: number;

  /** JSON dump of RAW records (before unique) */
  recordsJson: string;
  /** */
  recordsJsonTruncated: boolean;

  /** */
  runAttempted: boolean;
  /** */
  runUpdated: boolean;
  /** */
  runUpdateIdentifier: 'transcendID' | 'email' | '';
  /** */
  runError: string;
};

/**
 *
 * @param record
 */
function fingerprintRecord(record: PreferenceRecord): string {
  const ids = (record.identifiers ?? [])
    .filter((x) => x?.name && x?.value)
    .map((x) => ({ name: String(x.name), value: String(x.value) }))
    .sort((a, b) =>
      a.name === b.name
        ? a.value.localeCompare(b.value)
        : a.name.localeCompare(b.name),
    );

  const purposes = (record.purposes ?? [])
    .map((p) => {
      const prefs = (p.preferences ?? [])
        .map((pr) => ({ topic: pr.topic ?? '', choice: pr.choice ?? null }))
        .sort((a, b) => String(a.topic).localeCompare(String(b.topic)));

      return { purpose: p.purpose, enabled: !!p.enabled, preferences: prefs };
    })
    .sort((a, b) => String(a.purpose).localeCompare(String(b.purpose)));

  return JSON.stringify({ identifiers: ids, purposes });
}

/**
 *
 * @param records
 */
function getUniqueEmails(records: PreferenceRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records) {
    for (const id of r.identifiers ?? []) {
      if (id?.name === 'email' && id.value) {
        const v = String(id.value).trim();
        if (v) set.add(v);
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Build lookup map with duplicates preserved.
 *
 * @param records
 */
function buildLookupMapAll(
  records: PreferenceRecord[],
): Map<string, PreferenceRecord[]> {
  const m = new Map<string, PreferenceRecord[]>();
  for (const r of records) {
    for (const id of r.identifiers ?? []) {
      if (!id?.name || !id?.value) continue;
      const k = `${id.name}:${id.value}`;
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }
  }
  return m;
}

/**
 *
 * @param records
 */
function uniqueByFingerprint(records: PreferenceRecord[]): PreferenceRecord[] {
  const seen = new Set<string>();
  const out: PreferenceRecord[] = [];
  for (const r of records) {
    const fp = fingerprintRecord(r);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(r);
  }
  return out;
}

/**
 *
 * @param records
 */
function countRawVsUniqueByFingerprint(records: PreferenceRecord[]): {
  /** */
  raw: number;
  /** */
  unique: number;
} {
  const seen = new Set<string>();
  for (const r of records) seen.add(fingerprintRecord(r));
  return { raw: records.length, unique: seen.size };
}

/**
 * Fetch preferences for NON-shared identifiers (transcendID/email) in a batch,
 * caching raw results PER identifier value.
 *
 * IMPORTANT: Cache stores RAW arrays (not deduped).
 *
 * @param sombra
 * @param opts
 */
async function getPreferencesForIdentifiersCachedRaw(
  sombra: Got,
  opts: {
    /** */
    identifiers: Identifier[];
    /** */
    partitionKey: string;
    /** */
    logInterval: number;
    /** */
    cache: Map<string, PreferenceRecord[]>;
    /** */
    counters: {
      /** */ hit: number /** */;
      /** */
      miss: number;
    };
  },
): Promise<PreferenceRecord[]> {
  if (opts.identifiers.length === 0) return [];

  const toFetch: Identifier[] = [];
  const fromCache: PreferenceRecord[] = [];

  for (const id of opts.identifiers) {
    const k = `${id.name}:${id.value}`;
    const cached = opts.cache.get(k);
    if (cached) {
      opts.counters.hit += 1;
      fromCache.push(...cached);
    } else {
      opts.counters.miss += 1;
      toFetch.push(id);
    }
  }

  if (toFetch.length === 0) return fromCache;

  const fetched = (await getPreferencesForIdentifiers(sombra, {
    identifiers: toFetch,
    partitionKey: opts.partitionKey,
    concurrency: 50,
    logInterval: opts.logInterval,
    skipLogging: true,
  })) as any as PreferenceRecord[];

  // Populate cache PER identifier by scanning returned records.
  // This preserves duplicates in the cached arrays.
  const lookupFetched = buildLookupMapAll(fetched);
  for (const id of toFetch) {
    const k = `${id.name}:${id.value}`;
    opts.cache.set(k, lookupFetched.get(k) ?? []);
  }

  return [...fromCache, ...fetched];
}

/**
 * Shared identifiers (personID) must be queried one-by-one.
 * Cache stores RAW arrays per identifier.
 *
 * @param sombra
 * @param opts
 */
async function getPreferencesForSharedIdentifiersOneByOneCachedRaw(
  sombra: Got,
  opts: {
    /** */
    identifiers: Identifier[];
    /** */
    partitionKey: string;
    /** */
    cache: Map<string, PreferenceRecord[]>;
    /** */
    counters: {
      /** */ hit: number /** */;
      /** */
      miss: number;
    };
  },
): Promise<PreferenceRecord[]> {
  if (opts.identifiers.length === 0) return [];

  const results = await map(
    opts.identifiers,
    async (identifier) => {
      const cacheKey = `${identifier.name}:${identifier.value}`;
      const cached = opts.cache.get(cacheKey);
      if (cached) {
        opts.counters.hit += 1;
        return cached;
      }
      opts.counters.miss += 1;

      const recs = (await getPreferencesForIdentifiers(sombra, {
        identifiers: [identifier],
        partitionKey: opts.partitionKey,
        concurrency: 1,
        logInterval: 999999999,
        skipLogging: true,
      })) as any as PreferenceRecord[];

      opts.cache.set(cacheKey, recs);
      return recs;
    },
    { concurrency: 25 },
  );

  return results.flat();
}

/**
 *
 * @param sombra
 * @param args
 */
async function putIdentifierOnly(
  sombra: Got,
  args: {
    /** */ partition: string /** */;
    /** */
    identifier: Identifier;
  },
): Promise<void> {
  try {
    await sombra
      .put('v1/preferences', {
        json: {
          records: [
            {
              timestamp: new Date(
                Date.now() - 365 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              partition: args.partition,
              identifiers: [args.identifier],
            },
          ],
          skipWorkflowTriggers: true,
        },
      })
      .json();
  } catch (e) {
    throw new Error(`Failed to put identifier: ${e?.response?.body}`);
  }
}

/**
 *
 * @param v
 */
function csvEscape(v: string): string {
  const s = v ?? '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 *
 * @param n
 */
function ms(n: number): string {
  if (n < 1000) return `${n}ms`;
  return `${(n / 1000).toFixed(2)}s`;
}

/**
 *
 */
async function main(): Promise<void> {
  const opts: Options = {
    in: path.resolve('./working/costco/concerns/out.csv'),
    partition: process.env.PARTITION ?? '448b3320-9d7c-499a-bc56-f0dae33c8f5c',
    batchSize: Number(process.env.BATCH_SIZE ?? '500'),
    downloadLogInterval: Number(process.env.DOWNLOAD_LOG_INTERVAL ?? '100'),
    transcendUrl: process.env.TRANSCEND_URL ?? '',
    transcendApiKey: process.env.TRANSCEND_API_KEY ?? '',
    sombraApiKey: process.env.SOMBRA_API_KEY,
  };

  const runEnabled = String(process.env.RUN ?? '').toLowerCase() === 'true';
  const maxJsonChars = Number(process.env.MAX_JSON_CHARS ?? '50000');

  if (!opts.transcendUrl || !opts.transcendApiKey) {
    throw new Error(
      'Missing TRANSCEND_URL or TRANSCEND_API_KEY in environment.',
    );
  }

  const t0 = Date.now();

  logger.info(colors.green(`Reading CSV: ${opts.in}`));
  const rows = readCsv(opts.in, OutRowCodec, { columns: true }) as OutRow[];

  const rawFile = fs.readFileSync(opts.in, 'utf-8');
  const headerLine =
    rawFile.split(/\r?\n/)[0] ?? 'personID,transcendID,email_withheld';

  const extraHeaders = [
    'lookupBy',
    'lookupValue',
    'totalRecordsRaw',
    'totalRecords',
    'distinctVariants',
    'largestVariantCount',
    'identicalRecordCount',
    'allIdentical',
    'email',
    'emailCount',
    'multiEmail',
    'isDuplicateRow',
    'dupOfRowIndex',
    'recordsJsonTruncated',
    'recordsJson',
    'runAttempted',
    'runUpdated',
    'runUpdateIdentifier',
    'runError',
  ];

  logger.info(colors.green('Creating Sombra client...'));
  const sombra = await createSombraGotInstance(
    opts.transcendUrl,
    opts.transcendApiKey,
    opts.sombraApiKey,
  );

  // RAW caches (per identifier value)
  const personIdCache = new Map<string, PreferenceRecord[]>();
  const transcendIdCache = new Map<string, PreferenceRecord[]>();
  const emailCache = new Map<string, PreferenceRecord[]>();

  // duplicate-row tracking
  const rowSeen = new Map<string, number>();

  const outTmp = `${opts.in}.tmp`;
  const writer = fs.createWriteStream(outTmp, { encoding: 'utf8' });
  writer.write(`${headerLine},${extraHeaders.join(',')}\n`);

  const batches = chunk(rows, opts.batchSize);
  logger.info(
    colors.magenta(
      `Processing ${rows.length} rows in ${batches.length} batches (batchSize=${opts.batchSize}) RUN=${runEnabled}`,
    ),
  );

  const progressBar = new cliProgress.SingleBar(
    {
      format: `Rows |${colors.cyan(
        '{bar}',
      )}| {value}/{total} | {percentage}% | ETA {eta}s | batch {batch}/{batches}`,
    },
    cliProgress.Presets.shades_classic,
  );
  progressBar.start(rows.length, 0, { batch: 0, batches: batches.length });

  let processed = 0;
  let written = 0;
  let dupRows = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchT0 = Date.now();

    progressBar.update(processed, {
      batch: batchIndex + 1,
      batches: batches.length,
    });

    // counters for cache efficiency
    const cTrans = { hit: 0, miss: 0 };
    const cEmail = { hit: 0, miss: 0 };
    const cPerson = { hit: 0, miss: 0 };

    const stage0 = Date.now();
    const transcendIDs: Identifier[] = uniqBy(
      batch
        .map((r) => {
          const v = String((r as any).transcendID ?? '').trim();
          return v ? ({ name: 'transcendID', value: v } as Identifier) : null;
        })
        .filter(Boolean) as Identifier[],
      (x) => `${x.name}:${x.value}`,
    );

    const personIDs: Identifier[] = uniqBy(
      batch
        .map((r) => {
          const v = String((r as any).personID ?? '').trim();
          return v ? ({ name: 'personID', value: v } as Identifier) : null;
        })
        .filter(Boolean) as Identifier[],
      (x) => `${x.name}:${x.value}`,
    );

    const emails: Identifier[] = uniqBy(
      batch
        .map((r) => {
          const v = String((r as any).email ?? '').trim();
          return v && v.includes('@')
            ? ({ name: 'email', value: v } as Identifier)
            : null;
        })
        .filter(Boolean) as Identifier[],
      (x) => `${x.name}:${x.value}`,
    );

    const idBuildMs = Date.now() - stage0;

    // FETCH RAW (no dedupe here)
    const stage1 = Date.now();
    const [recordsByTranscendRaw, recordsByPersonRaw, recordsByEmailRaw] =
      await Promise.all([
        getPreferencesForIdentifiersCachedRaw(sombra, {
          identifiers: transcendIDs,
          partitionKey: opts.partition,
          logInterval: opts.downloadLogInterval,
          cache: transcendIdCache,
          counters: cTrans,
        }),
        getPreferencesForSharedIdentifiersOneByOneCachedRaw(sombra, {
          identifiers: personIDs,
          partitionKey: opts.partition,
          cache: personIdCache,
          counters: cPerson,
        }),
        getPreferencesForIdentifiersCachedRaw(sombra, {
          identifiers: emails,
          partitionKey: opts.partition,
          logInterval: opts.downloadLogInterval,
          cache: emailCache,
          counters: cEmail,
        }),
      ]);
    const fetchMs = Date.now() - stage1;

    // Batch-level “how many dupes” metrics (raw vs unique-by-fingerprint)
    const tCounts = countRawVsUniqueByFingerprint(recordsByTranscendRaw);
    const pCounts = countRawVsUniqueByFingerprint(recordsByPersonRaw);
    const eCounts = countRawVsUniqueByFingerprint(recordsByEmailRaw);

    const allRaw = [
      ...(recordsByTranscendRaw as PreferenceRecord[]),
      ...(recordsByPersonRaw as PreferenceRecord[]),
      ...(recordsByEmailRaw as PreferenceRecord[]),
    ];
    const allCounts = countRawVsUniqueByFingerprint(allRaw);

    // Lookup map MUST preserve duplicates so per-row raw length is meaningful
    const lookupMapRaw = buildLookupMapAll(allRaw);

    // ROW PROCESSING
    const stage2 = Date.now();
    const results = await map(
      batch,
      async (r, idxInBatch) => {
        const rowIndex = batchIndex * opts.batchSize + idxInBatch + 1;

        const personID = String((r as any).personID ?? '').trim();
        const transcendID = String((r as any).transcendID ?? '').trim();
        const emailWithheld = String((r as any).email_withheld ?? '').trim();
        const email = String((r as any).email ?? '').trim();

        const lookupBy: 'transcendID' | 'personID' = transcendID
          ? 'transcendID'
          : 'personID';
        const lookupValue = transcendID || personID || '';

        const rowKey = `${personID}||${transcendID}||${emailWithheld}`;
        const firstSeenAt = rowSeen.get(rowKey) ?? 0;
        const isDup = firstSeenAt > 0;
        if (!isDup) rowSeen.set(rowKey, rowIndex);
        else dupRows += 1;

        const metrics: RowMetrics = {
          lookupBy,
          lookupValue,
          totalRecordsRaw: 0,
          totalRecords: 0,

          email: '',
          emailCount: 0,
          multiEmail: false,

          distinctVariants: 0,
          largestVariantCount: 0,
          identicalRecordCount: 0,
          allIdentical: false,

          isDuplicateRow: isDup,
          dupOfRowIndex: isDup ? firstSeenAt : 0,

          recordsJson: '',
          recordsJsonTruncated: false,

          runAttempted: false,
          runUpdated: false,
          runUpdateIdentifier: '',
          runError: '',
        };

        if (!lookupValue) {
          metrics.runError = 'Missing both transcendID and personID';
          return { personID, transcendID, emailWithheld, metrics };
        }

        // RAW matches (duplicates preserved)
        const recsRaw: PreferenceRecord[] = [
          ...(transcendID
            ? lookupMapRaw.get(`transcendID:${transcendID}`) ?? []
            : []),
          // ...(personID ? lookupMapRaw.get(`personID:${personID}`) ?? [] : []),
          ...(email && email.includes('@')
            ? lookupMapRaw.get(`email:${email}`) ?? []
            : []),
        ];

        metrics.totalRecordsRaw = recsRaw.length;

        // Unique-by-fingerprint (this is where you measure “how many dupes”)
        const recsUnique = uniqueByFingerprint(recsRaw);
        metrics.totalRecords = recsUnique.length;

        // email source of truth from UNIQUE set
        const emailsFound = getUniqueEmails(recsUnique);
        metrics.emailCount = emailsFound.length;
        metrics.multiEmail = emailsFound.length > 1;
        metrics.email = emailsFound.length === 1 ? emailsFound[0] : '';

        // variant stats on UNIQUE set
        if (recsUnique.length > 0) {
          metrics.distinctVariants = recsUnique.length; // because recsUnique is unique by fingerprint
          metrics.largestVariantCount = 1;
          metrics.identicalRecordCount = 1;
          metrics.allIdentical = recsUnique.length === 1;
        }

        // JSON dump of RAW records (pre-unique)
        let json = '';
        try {
          json = JSON.stringify(recsRaw);
        } catch (e: any) {
          json = JSON.stringify({
            error: 'Failed to stringify recsRaw',
            message: e?.message ?? String(e),
          });
        }
        if (maxJsonChars > 0 && json.length > maxJsonChars) {
          metrics.recordsJsonTruncated = true;
          metrics.recordsJson = json.slice(0, maxJsonChars);
        } else {
          metrics.recordsJson = json;
        }

        if (runEnabled) {
          metrics.runAttempted = true;
          try {
            if (transcendID) {
              await putIdentifierOnly(sombra, {
                partition: opts.partition,
                identifier: { name: 'transcendID', value: transcendID },
              });
              metrics.runUpdated = true;
              metrics.runUpdateIdentifier = 'transcendID';
            } else if (emailsFound.length === 1) {
              await putIdentifierOnly(sombra, {
                partition: opts.partition,
                identifier: { name: 'email', value: emailsFound[0] },
              });
              metrics.runUpdated = true;
              metrics.runUpdateIdentifier = 'email';
            } else if (emailsFound.length === 0) {
              metrics.runError =
                'RUN enabled but no transcendID and no email found in existing records';
            } else {
              metrics.runError = `RUN enabled but multiple emails found (${emailsFound.length})`;
            }
          } catch (err: any) {
            metrics.runError = err?.message ?? String(err);
          }
          if (metrics.runError) {
            logger.warn(
              colors.yellow(
                `Row ${rowIndex} update error: ${metrics.runError}`,
              ),
            );
          }
        }

        return { personID, transcendID, emailWithheld, metrics };
      },
      { concurrency: 50 },
    );
    const processMs = Date.now() - stage2;

    // WRITE (always write 1 output row per input row)
    const stage3 = Date.now();
    for (const {
      personID,
      transcendID,
      emailWithheld,
      metrics,
    } of results as any) {
      writer.write(
        `${[
          csvEscape(personID),
          csvEscape(transcendID),
          csvEscape(emailWithheld),

          csvEscape(metrics.lookupBy),
          csvEscape(metrics.lookupValue),
          csvEscape(String(metrics.totalRecordsRaw)),
          csvEscape(String(metrics.totalRecords)),
          csvEscape(String(metrics.distinctVariants)),
          csvEscape(String(metrics.largestVariantCount)),
          csvEscape(String(metrics.identicalRecordCount)),
          csvEscape(String(metrics.allIdentical)),

          csvEscape(metrics.email),
          csvEscape(String(metrics.emailCount)),
          csvEscape(String(metrics.multiEmail)),

          csvEscape(String(metrics.isDuplicateRow)),
          csvEscape(String(metrics.dupOfRowIndex)),

          csvEscape(String(metrics.recordsJsonTruncated)),
          csvEscape(metrics.recordsJson),

          csvEscape(String(metrics.runAttempted)),
          csvEscape(String(metrics.runUpdated)),
          csvEscape(metrics.runUpdateIdentifier),
          csvEscape(metrics.runError),
        ].join(',')}\n`,
      );
      written += 1;
    }
    const writeMs = Date.now() - stage3;

    processed += batch.length;
    progressBar.update(processed, {
      batch: batchIndex + 1,
      batches: batches.length,
    });

    const batchMs = Date.now() - batchT0;

    // This is the key log you want: raw vs unique before any dedupe.
    logger.info(
      colors.green(
        `Batch ${batchIndex + 1}/${batches.length} rows=${
          batch.length
        } written=${written} dupRows=${dupRows} ` +
          `| ids: tID=${transcendIDs.length} email=${emails.length} personID=${personIDs.length} ` +
          `| fetched(raw/uniq): tID=${tCounts.raw}/${tCounts.unique} ` +
          `email=${eCounts.raw}/${eCounts.unique} personID=${pCounts.raw}/${pCounts.unique} ` +
          `ALL=${allCounts.raw}/${allCounts.unique} ` +
          `| cache(hit/miss): tID=${cTrans.hit}/${cTrans.miss} email=${cEmail.hit}/${cEmail.miss} personID=${cPerson.hit}/${cPerson.miss} ` +
          `| timing: build=${ms(idBuildMs)} fetch=${ms(fetchMs)} process=${ms(
            processMs,
          )} write=${ms(writeMs)} total=${ms(batchMs)}`,
      ),
    );
  }

  progressBar.update(rows.length);
  progressBar.stop();

  await new Promise<void>((resolve, reject) => {
    writer.end(() => resolve());
    writer.on('error', reject);
  });

  fs.renameSync(outTmp, opts.in);

  const totalMs = Date.now() - t0;
  logger.info(
    colors.magenta(
      `Done. Wrote ${written}/${rows.length} rows (dupRows=${dupRows}) to "${
        opts.in
      }" in ${ms(totalMs)}.`,
    ),
  );
}

main().catch((err) => {
  logger.error(colors.red(err?.stack ?? String(err)));
  process.exit(1);
});
/* eslint-enable jsdoc/require-description,jsdoc/require-returns,jsdoc/require-param-description,@typescript-eslint/no-explicit-any,max-lines,no-continue,no-loop-func,no-param-reassign */
/* eslint-enable max-len */
