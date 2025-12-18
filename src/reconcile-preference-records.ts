#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any,max-lines,no-continue,no-param-reassign */

import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';
import cliProgress from 'cli-progress';

import { uniqBy } from 'lodash-es';
import type { Got } from 'got';
import * as t from 'io-ts';

import { logger } from './logger';
import { createSombraGotInstance } from './lib/graphql';
import {
  getPreferencesForIdentifiers,
  type PreferenceIdentifier,
} from './lib/preference-management';

import Bluebird from 'bluebird';
import { readCsv } from './lib/requests';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

const { map } = Bluebird;

/**
 * Script options.
 *
 * Most values can be driven via environment variables.
 */
type Options = {
  /** Path to input CSV (will be overwritten with output columns). */
  in: string;
  /** Partition key to query within Preference Store. */
  partition: string;
  /** Logging interval for large downloads (kept for parity; currently not used inside cached fetch). */
  downloadLogInterval: number;
  /** Base Transcend URL (e.g. https://multi-tenant.sombra.us.transcend.io/). */
  transcendUrl: string;
  /** API key for Transcend. */
  transcendApiKey: string;
  /** Optional "Sombra" API key (if your env requires it). */
  sombraApiKey?: string;
  /**
   * If true, will PUT minimal preference records to "touch" identifiers.
   *
   * New behavior:
   * - If transcendID exists: PUT transcendID, then PUT each email found for the personID (if any).
   * - If no transcendID: PUT each email found for the personID.
   * - If neither transcendID nor any email: write an error.
   */
  runEnabled?: boolean;
};

/**
 * CSV schema for rows in the "out.csv" you are enriching.
 * Additional columns may exist; io-ts intersection allows extra keys.
 */
const OutRowCodec = t.intersection([
  t.type({
    personID: t.string,
    transcendID: t.string,
    email_withheld: t.string,
  }),
  t.record(t.string, t.unknown),
]);

/**
 * Per-row computed metrics written to CSV.
 */
type RowMetrics = {
  /**
   * RAW count of records returned for `transcendID:<value>`.
   * Duplicates are preserved (if the API returns duplicates, they count here).
   */
  totalRecordsByTranscendID: number;

  /**
   * Unique-by-fingerprint count within the records returned for `transcendID:<value>`.
   * This collapses "identical" records to 1 (based on identifiers+purposes fingerprint).
   */
  uniqueRecordCountByTranscendID: number;

  /**
   * RAW count of records returned for `personID:<value>`.
   * Duplicates are preserved.
   */
  totalRecordsByPersonId: number;

  /**
   * Unique-by-fingerprint count within the records returned for `personID:<value>`.
   */
  uniqueRecordCountByPersonID: number;

  /**
   * Unique emails found across ALL records returned for `personID:<value>`.
   * Serialized as `email1|email2|...` in the CSV output.
   */
  emailsForPersonId: string[];

  /**
   * emailCount MUST equal `emailsForPersonId.length`.
   */
  emailCount: number;

  /** True if this CSV input row is a duplicate of a prior row (same personID+transcendID+email_withheld). */
  isDuplicateRow: boolean;
  /** Row index (0-based) of the first occurrence this row duplicates. 0 if not a duplicate. */
  dupOfRowIndex: number;

  /** Whether the optional RUN update logic attempted any PUT(s). */
  runAttempted: boolean;
  /** Whether ALL intended PUT(s) succeeded for this row. */
  runUpdated: boolean;
  /**
   * What triggered the RUN update attempt:
   * - 'transcendID' if we attempted a transcendID PUT (even if we also PUT emails).
   * - 'email' if we only PUT emails (no transcendID present).
   * - '' if RUN disabled or no updates attempted.
   */
  runUpdateIdentifier: 'transcendID' | 'email' | '';
  /** Error message captured during RUN update logic (first failure). */
  runError: string;
};

/**
 * Create a stable fingerprint for a preference record so we can dedupe variants.
 * Fingerprint includes:
 * - identifiers (name/value, sorted)
 * - purposes (purpose/enabled, plus sorted preferences)
 *
 * @param record - preference record from the API
 * @returns JSON string fingerprint
 */
function fingerprintRecord(record: PreferenceQueryResponseItem): string {
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
 * Extract unique emails from a set of records.
 *
 * @param records - preference records
 * @returns sorted unique emails
 */
function getUniqueEmails(records: PreferenceQueryResponseItem[]): string[] {
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
 * Build a lookup map from `name:value` -> array of records, preserving duplicates.
 *
 * This is used so we can easily retrieve the record list for a specific identifier
 * without losing multiplicity.
 *
 * @param records - all fetched records (possibly with duplicates)
 * @returns map from identifier key to record list
 */
function buildLookupMapAll(
  records: PreferenceQueryResponseItem[],
): Map<string, PreferenceQueryResponseItem[]> {
  const m = new Map<string, PreferenceQueryResponseItem[]>();
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
 * Dedupe a record list by fingerprint (identifiers+purposes).
 *
 * @param records - record list (can include duplicates / repeated variants)
 * @returns list with only first occurrence of each fingerprint
 */
function uniqueByFingerprint(
  records: PreferenceQueryResponseItem[],
): PreferenceQueryResponseItem[] {
  const seen = new Set<string>();
  const out: PreferenceQueryResponseItem[] = [];
  for (const r of records) {
    const fp = fingerprintRecord(r);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(r);
  }
  return out;
}

/**
 * Fetch preferences for NON-shared identifiers (transcendID, email) in a batch,
 * caching RAW results per identifier key (`name:value`).
 *
 * IMPORTANT:
 * - Cache stores RAW arrays (not deduped).
 * - Returned list is a concatenation of cached hits + fetched misses.
 *
 * @param sombra - got client
 * @param opts - fetch options
 * @returns fetched records (RAW)
 */
async function getPreferencesForIdentifiersCachedRaw(
  sombra: Got,
  opts: {
    /** Identifiers to query in batch. */
    identifiers: PreferenceIdentifier[];
    /** Partition key. */
    partitionKey: string;
    /** Logging interval (unused in current implementation, retained for compatibility). */
    logInterval: number;
    /** Cache of `name:value` -> records returned for that identifier. */
    cache: Map<string, PreferenceQueryResponseItem[]>;
    /** Cache hit/miss counters (mutated). */
    counters: {
      /** Hit */
      hit: number;
      /** Miss */
      miss: number;
    };
  },
): Promise<PreferenceQueryResponseItem[]> {
  if (opts.identifiers.length === 0) return [];

  const toFetch: PreferenceIdentifier[] = [];
  const fromCache: PreferenceQueryResponseItem[] = [];

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
    skipLogging: true,
  })) as any as PreferenceQueryResponseItem[];

  // Populate cache PER identifier by scanning returned records (preserving duplicates).
  const lookupFetched = buildLookupMapAll(fetched);
  for (const id of toFetch) {
    const k = `${id.name}:${id.value}`;
    opts.cache.set(k, lookupFetched.get(k) ?? []);
  }

  return [...fromCache, ...fetched];
}

/**
 * Fetch preferences for SHARED identifiers (personID) one-by-one,
 * caching RAW results per identifier key (`name:value`).
 *
 * @param sombra - got client
 * @param opts - fetch options
 * @returns fetched records (RAW)
 */
async function getPreferencesForSharedIdentifiersOneByOneCachedRaw(
  sombra: Got,
  opts: {
    /** Identifiers to query. Each is fetched individually. */
    identifiers: PreferenceIdentifier[];
    /** Partition key. */
    partitionKey: string;
    /** Cache of `name:value` -> records returned for that identifier. */
    cache: Map<string, PreferenceQueryResponseItem[]>;
    /** Cache hit/miss counters (mutated). */
    counters: {
      /** Hit */
      hit: number;
      /** Miss */
      miss: number;
    };
  },
): Promise<PreferenceQueryResponseItem[]> {
  if (opts.identifiers.length === 0) return [];

  let cnt = 0;

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
        skipLogging: true,
      })) as any as PreferenceQueryResponseItem[];

      opts.cache.set(cacheKey, recs);
      cnt += 1;
      if (cnt % 100 === 0) {
        logger.info(
          colors.gray(
            `Fetched ${cnt}/${opts.identifiers.length} personID identifiers...`,
          ),
        );
      }
      return recs;
    },
    { concurrency: 25 },
  );

  return results.flat();
}

/**
 * Optional "touch" update: PUT a preference record containing only one identifier.
 * This is used when RUN=true to backfill / normalize identifier-only records.
 *
 * @param sombra - got client
 * @param args - update args
 */
async function putIdentifierOnly(
  sombra: Got,
  args: {
    /** Partition key. */
    partition: string;
    /** Identifier to write. */
    identifier: PreferenceIdentifier;
  },
): Promise<void> {
  try {
    await sombra
      .put('v1/preferences', {
        json: {
          records: [
            {
              // Use an old timestamp so this doesn't look like a recent interaction.
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
 * Escape a scalar value for CSV output.
 *
 * @param v - string value
 * @returns CSV-safe string
 */
function csvEscape(v: string): string {
  const s = v ?? '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Escape a list for CSV output.
 * We encode lists as a "|" delimited string, then CSV-escape the whole cell.
 *
 * @param values - list of values
 * @returns CSV-safe encoded list
 */
function csvEscapeList(values: string[]): string {
  return csvEscape(values.join('|'));
}

/**
 * Output columns written to the CSV (in order).
 */
const OUTPUT_HEADERS = [
  'personID',
  'transcendID',
  'email_withheld',

  'totalRecordsByTranscendID',
  'uniqueRecordCountByTranscendID',

  'totalRecordsByPersonId',
  'uniqueRecordCountByPersonID',

  'emailsForPersonId',
  'emailCount',

  'isDuplicateRow',
  'dupOfRowIndex',

  'runAttempted',
  'runUpdated',
  'runUpdateIdentifier',
  'runError',
];

/**
 * Entrypoint.
 */
async function main(): Promise<void> {
  // 1) Construct options (defaults + env overrides)
  const opts: Options = {
    in: path.resolve('./working/costco/concerns/out.csv'),
    partition: process.env.PARTITION ?? '448b3320-9d7c-499a-bc56-f0dae33c8f5c',
    downloadLogInterval: Number(process.env.DOWNLOAD_LOG_INTERVAL ?? '100'),
    transcendUrl: process.env.TRANSCEND_URL ?? '',
    transcendApiKey: process.env.TRANSCEND_API_KEY ?? '',
    sombraApiKey: process.env.SOMBRA_API_KEY,
    runEnabled: String(process.env.RUN ?? '').toLowerCase() === 'true',
  };

  if (!opts.transcendUrl || !opts.transcendApiKey) {
    throw new Error(
      'Missing TRANSCEND_URL or TRANSCEND_API_KEY in environment.',
    );
  }

  // 2) Read input CSV
  logger.info(colors.green(`Reading CSV: ${opts.in}`));
  const rows = readCsv(opts.in, OutRowCodec, {
    columns: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
  });

  // 3) Create Sombra client
  logger.info(colors.green('Creating Sombra client...'));
  const sombra = await createSombraGotInstance(
    opts.transcendUrl,
    opts.transcendApiKey,
    opts.sombraApiKey,
  );

  // 4) Prepare caches (RAW per identifier)
  const personIdCache = new Map<string, PreferenceQueryResponseItem[]>();
  const transcendIdCache = new Map<string, PreferenceQueryResponseItem[]>();

  // 5) Track duplicate CSV input rows (so we can flag them in output)
  const rowSeen = new Map<string, number>();

  // 6) Setup output writer to a temp file (we'll rename over input at the end)
  const outTmp = `${opts.in}.tmp`;
  const writer = fs.createWriteStream(outTmp, { encoding: 'utf8' });
  writer.write(`${OUTPUT_HEADERS.join(',')}\n`);

  logger.info(
    colors.magenta(`Processing ${rows.length} rows - RUN=${opts.runEnabled}`),
  );

  let processed = 0;
  let dupRows = 0;

  // 8) Cache efficiency counters
  const cTrans = { hit: 0, miss: 0 };
  const cPerson = { hit: 0, miss: 0 };

  // 9) Extract unique identifier values from CSV
  const transcendIDs: PreferenceIdentifier[] = uniqBy(
    rows
      .map((r) => {
        const v = String((r as any).transcendID ?? '').trim();
        return v
          ? ({ name: 'transcendID', value: v } as PreferenceIdentifier)
          : null;
      })
      .filter(Boolean) as PreferenceIdentifier[],
    (x) => `${x.name}:${x.value}`,
  );

  const personIDs: PreferenceIdentifier[] = uniqBy(
    rows
      .map((r) => {
        const v = String((r as any).personID ?? '').trim();
        return v
          ? ({ name: 'personID', value: v } as PreferenceIdentifier)
          : null;
      })
      .filter(Boolean) as PreferenceIdentifier[],
    (x) => `${x.name}:${x.value}`,
  );

  logger.info(
    colors.gray(
      `Found ${transcendIDs.length} unique transcendIDs and ${personIDs.length} unique personIDs in input.`,
    ),
  );

  // 10) Fetch RAW records once (batch for transcendID, one-by-one for personID)
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
  ]);

  logger.info(
    colors.gray(
      `Fetched preferences: transcendID cache size=${transcendIdCache.size}, personID cache size=${personIdCache.size}`,
    ),
  );

  // 7) Progress bar
  const progressBar = new cliProgress.SingleBar(
    {
      format: `Rows |${colors.cyan(
        '{bar}',
      )}| {value}/{total} | {percentage}% | ETA {eta}s`,
    },
    cliProgress.Presets.shades_classic,
  );
  progressBar.start(rows.length, 0);

  // 12) Process each row and write output line
  await map(
    rows,
    async (r, rowIndex) => {
      const personID = String((r as any).personID ?? '').trim();
      const transcendID = String((r as any).transcendID ?? '').trim();
      const emailWithheld = String((r as any).email_withheld ?? '').trim();

      // Duplicate-row detection based on the key fields in your CSV
      const rowKey = `${personID}||${transcendID}||${emailWithheld}`;
      const firstSeenAt = rowSeen.get(rowKey);
      const isDup = firstSeenAt !== undefined;
      if (!isDup) rowSeen.set(rowKey, rowIndex);
      else dupRows += 1;

      const metrics: RowMetrics = {
        totalRecordsByTranscendID: 0,
        uniqueRecordCountByTranscendID: 0,
        totalRecordsByPersonId: 0,
        uniqueRecordCountByPersonID: 0,
        emailsForPersonId: [],
        emailCount: 0,

        isDuplicateRow: isDup,
        dupOfRowIndex: isDup ? (firstSeenAt as number) : 0,

        runAttempted: false,
        runUpdated: false,
        runUpdateIdentifier: '',
        runError: '',
      };

      if (!personID && !transcendID) {
        // Keep processing other rows; write an error for this row.
        metrics.runError = 'Missing both transcendID and personID';
        writer.write(
          `${[
            csvEscape(personID),
            csvEscape(transcendID),
            csvEscape(emailWithheld),

            csvEscape(String(metrics.totalRecordsByTranscendID)),
            csvEscape(String(metrics.uniqueRecordCountByTranscendID)),

            csvEscape(String(metrics.totalRecordsByPersonId)),
            csvEscape(String(metrics.uniqueRecordCountByPersonID)),

            csvEscapeList(metrics.emailsForPersonId),
            csvEscape(String(metrics.emailCount)),

            csvEscape(String(metrics.isDuplicateRow)),
            csvEscape(String(metrics.dupOfRowIndex)),

            csvEscape(String(metrics.runAttempted)),
            csvEscape(String(metrics.runUpdated)),
            csvEscape(metrics.runUpdateIdentifier),
            csvEscape(metrics.runError),
          ].join(',')}\n`,
        );

        processed += 1;
        progressBar.update(processed);
        return;
      }

      // Fetch RAW record lists from the lookup map (duplicates preserved)
      const recsByTranscendRaw = transcendID
        ? transcendIdCache.get(`transcendID:${transcendID}`) ?? []
        : [];

      const recsByPersonRaw = personID
        ? personIdCache.get(`personID:${personID}`) ?? []
        : [];

      // RAW counts
      metrics.totalRecordsByTranscendID = recsByTranscendRaw.length;
      metrics.totalRecordsByPersonId = recsByPersonRaw.length;

      // Unique-by-fingerprint counts per identifier
      metrics.uniqueRecordCountByTranscendID =
        uniqueByFingerprint(recsByTranscendRaw).length;
      metrics.uniqueRecordCountByPersonID =
        uniqueByFingerprint(recsByPersonRaw).length;

      // Emails for personID + emailCount rule
      metrics.emailsForPersonId = getUniqueEmails(recsByPersonRaw);
      metrics.emailCount = metrics.emailsForPersonId.length;

      // RUN update behavior (updated per your request):
      // - If transcendID exists: PUT transcendID, then PUT EACH email in emailsForPersonId.
      // - If no transcendID: PUT EACH email in emailsForPersonId.
      // - If neither transcendID nor any email: write error.
      if (opts.runEnabled) {
        metrics.runAttempted = true;

        // Decide what we intend to PUT for this row.
        const emailsToPut = metrics.emailsForPersonId;
        const shouldPutTranscendId = !!transcendID;

        if (!shouldPutTranscendId && emailsToPut.length === 0) {
          metrics.runError =
            'RUN enabled but no transcendID and no emails found';
        } else {
          try {
            // 1) PUT transcendID first (if present)
            if (shouldPutTranscendId) {
              await putIdentifierOnly(sombra, {
                partition: opts.partition,
                identifier: { name: 'transcendID', value: transcendID },
              });
              metrics.runUpdateIdentifier = 'transcendID';
            } else {
              // No transcendID; we're going to do email-only updates.
              metrics.runUpdateIdentifier = 'email';
            }

            // 2) PUT each email (if any)
            for (const email of emailsToPut) {
              await putIdentifierOnly(sombra, {
                partition: opts.partition,
                identifier: { name: 'email', value: email },
              });
            }

            // If we got here, all intended PUTs succeeded.
            metrics.runUpdated = true;
          } catch (err: any) {
            metrics.runError = err?.message ?? String(err);
          }
        }

        if (metrics.runError) {
          logger.warn(
            colors.yellow(`Row ${rowIndex} update error: ${metrics.runError}`),
          );
        }
      }

      // Write output row
      writer.write(
        `${[
          csvEscape(personID),
          csvEscape(transcendID),
          csvEscape(emailWithheld),

          csvEscape(String(metrics.totalRecordsByTranscendID)),
          csvEscape(String(metrics.uniqueRecordCountByTranscendID)),

          csvEscape(String(metrics.totalRecordsByPersonId)),
          csvEscape(String(metrics.uniqueRecordCountByPersonID)),

          csvEscapeList(metrics.emailsForPersonId),
          csvEscape(String(metrics.emailCount)),

          csvEscape(String(metrics.isDuplicateRow)),
          csvEscape(String(metrics.dupOfRowIndex)),

          csvEscape(String(metrics.runAttempted)),
          csvEscape(String(metrics.runUpdated)),
          csvEscape(metrics.runUpdateIdentifier),
          csvEscape(metrics.runError),
        ].join(',')}\n`,
      );

      processed += 1;
      progressBar.update(processed);
    },
    { concurrency: 50 },
  );

  progressBar.update(rows.length);
  progressBar.stop();

  // 13) Close writer, then atomically replace input file with output file
  await new Promise<void>((resolve, reject) => {
    writer.end(() => resolve());
    writer.on('error', reject);
  });

  fs.renameSync(outTmp, opts.in);

  // 14) Final logs
  logger.info(
    colors.magenta(
      `Done. Wrote ${rows.length}/${rows.length} rows (dupRows=${dupRows}) to "${opts.in}".`,
    ),
  );

  logger.info(
    colors.gray(
      `Cache stats: transcendID hit=${cTrans.hit} miss=${cTrans.miss} | personID hit=${cPerson.hit} miss=${cPerson.miss}`,
    ),
  );
}

main().catch((err) => {
  logger.error(colors.red(err?.stack ?? String(err)));
  process.exit(1);
});

/* eslint-enable @typescript-eslint/no-explicit-any,max-lines,no-continue,no-param-reassign */
