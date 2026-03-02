<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Preference Data Upload Pipeline](#preference-data-upload-pipeline)
  - [Prerequisites](#prerequisites)
  - [Phase 1: Receive & Transform Raw Data](#phase-1-receive--transform-raw-data)
    - [1.1 Set up working directory](#11-set-up-working-directory)
    - [1.2 Ask the user](#12-ask-the-user)
    - [1.3 Write the transform script](#13-write-the-transform-script)
    - [1.4 Run and verify counts](#14-run-and-verify-counts)
  - [Phase 2: Chunk Large Files](#phase-2-chunk-large-files)
    - [2.1 Verify chunk counts](#21-verify-chunk-counts)
  - [Phase 3: Generate & Validate Config](#phase-3-generate--validate-config)
    - [3.1 Run interactive config](#31-run-interactive-config)
    - [3.2 Validate the config](#32-validate-the-config)
  - [Phase 4: Test Upload](#phase-4-test-upload)
    - [4.1 Ask the user](#41-ask-the-user)
    - [4.2 Run test upload](#42-run-test-upload)
    - [4.3 Generate verification links](#43-generate-verification-links)
    - [4.4 API verification script](#44-api-verification-script)
  - [Phase 5: Full Upload](#phase-5-full-upload)
    - [5.1 Key flags for production uploads](#51-key-flags-for-production-uploads)
    - [5.2 Copy config and run](#52-copy-config-and-run)
    - [5.3 Monitor progress](#53-monitor-progress)
    - [5.4 Resumability](#54-resumability)
  - [Phase 6: Error Analysis & Cleanup](#phase-6-error-analysis--cleanup)
  - [Phase 7: Executive Summary](#phase-7-executive-summary)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---

name: preference-data-upload
description: End-to-end workflow for uploading preference data to Transcend via the CLI. Covers receiving raw files, running transformation scripts, chunking, interactive config generation, test uploads with verification, and full production uploads. Use when the user mentions uploading preferences, preference migration, consent data upload, airtable upload, or bulk preference import.

---

# Preference Data Upload Pipeline

End-to-end workflow for uploading preference/consent data to Transcend's preference store via the CLI.

## Prerequisites

- Transcend CLI built and available (`pnpm build` then `pnpm start <command>`)
- A valid `TRANSCEND_API_KEY` with scopes: `Manage Preference Store`, `View Preference Store`
- The partition UUID for the target preference store
- The `--transcendUrl` for the org (e.g. `https://api.us.transcend.io` for US-backed)

## Phase 1: Receive & Transform Raw Data

### 1.1 Set up working directory

```
working/<project-name>/
├── raw/                  # Original files from customer (never modify)
├── exclusions/           # Block/suppression lists
├── transform.py          # or transform.ts — transformation script
├── output/
│   ├── batch_a/          # Chunked files for first-pass upload
│   ├── batch_b/          # Chunked files for second-pass (if split timestamps)
│   ├── test/             # Small subset for test uploads
│   └── all_chunks/       # Symlinks to all chunks (for config scanning)
└── README.md             # Document the pipeline for this project
```

### 1.2 Ask the user

- **Language preference**: Python (pandas) or TypeScript for the transform script?
- **Source files**: What are the raw input files and their schemas?
- **Exclusion list**: Is there a block/suppression list to filter out?
- **Column mappings**: Which columns map to email, name, country, purposes, timestamps?
- **Timestamp splitting**: Do any records have multiple consent timestamps that need splitting across batches?
- **Duplicate handling**: How should duplicate emails within a single source be handled?
  - **Keep last** (default): `df.sort_values('timestamp').drop_duplicates(subset='email_lower', keep='last')`
  - **Keep first**: Keep the earliest record
  - **Skip dedup**: Let the uploader handle it (it appends `___<index>` and API resolves by timestamp — works but generates warnings)

### 1.3 Write the transform script

The script must:

1. Load and deduplicate the exclusion list (lowercase + strip emails)
2. Read source files with `dtype=str` (Python) to preserve original values
3. Rename columns to the standardized schema
4. Clean placeholder values (`[none]`, whitespace) in name/country fields
5. Filter out excluded emails
6. Filter out records with no valid timestamp
7. **Deduplicate by email** within each source (sort by timestamp, keep last)
8. Handle timestamp splitting (batch_a = earliest consent, batch_b = later consent)
9. Merge overlapping records across sources (e.g. Marketo + Iterable country merge)
10. Write `output/batch_a/batch_a.csv` and `output/batch_b/batch_b.csv`
11. Run sanity checks: no exclusion leaks, print record counts

**Target output columns** (adjust per project):

```
email, firstName, lastName, <source>_country, <purpose>_Subscribed,
<purpose>_consent_date, timestamp
```

**Purpose column values**: `True`, `False`, or empty string (empty = no preference, will map to null).

### 1.4 Run and verify counts

```bash
cd working/<project-name>
python3 transform.py   # or: npx ts-node transform.ts
```

Cross-reference output counts with customer-provided numbers. Account for:

- Exclusion list removals
- Records with no timestamp (dropped)
- Duplicate emails across sources (merged, not double-counted)
- Timestamp splits creating batch_b rows

## Phase 2: Chunk Large Files

Files over ~10MB should be chunked for parallel upload. The `chunk-csv` command defaults to 10MB chunks.

```bash
pnpm start admin chunk-csv \
  --directory ./working/<project-name>/output/batch_a/ \
  --chunkSizeMB 10

pnpm start admin chunk-csv \
  --directory ./working/<project-name>/output/batch_b/ \
  --chunkSizeMB 10
```

After chunking, move the originals out so they don't get scanned/uploaded:

```bash
mv output/batch_a/batch_a.csv output/batch_a_original.csv
mv output/batch_b/batch_b.csv output/batch_b_original.csv
```

Create symlink directory for config scanning and test subset:

```bash
mkdir -p output/all_chunks output/test

# Symlink all chunks
for f in output/batch_a/batch_a_chunk_*.csv; do ln -s "../$f" output/all_chunks/; done
for f in output/batch_b/batch_b_chunk_*.csv; do ln -s "../$f" output/all_chunks/; done

# Test subset
head -101 output/batch_a/batch_a_chunk_0001.csv > output/test/test_100.csv
cp output/batch_a/batch_a_chunk_0001.csv output/test/
```

### 2.1 Verify chunk counts

**IMPORTANT**: Always verify row counts after chunking using `test_csv_count.sh`:

```bash
bash test_csv_count.sh -H ./working/<project-name>/output/batch_a/
bash test_csv_count.sh -H ./working/<project-name>/output/batch_b/
```

Cross-reference totals against the transform script output:

| Batch   | Expected Records | Actual Records | Chunks |
| ------- | ---------------- | -------------- | ------ |
| batch_a | X                | X              | N      |
| batch_b | X                | X              | N      |
| Total   | X                | X              | N      |

Do NOT proceed to upload until counts match.

> **Known issue — auto-chunk re-chunking**: The upload command has a built-in auto-chunk
> (default 11MB) that re-processes files. Since `chunk-csv` defaults to 10MB, some chunks
> land slightly over 10MB. The upload's 11MB threshold avoids re-chunking these. If you
> still see re-chunking, pass `--chunkSizeMB 0` to the upload command to disable it.
> Re-chunking creates duplicate files with `_chunk_0001` suffix that must be cleaned up.

## Phase 3: Generate & Validate Config

### 3.1 Run interactive config

```bash
pnpm start consent configure-preference-upload \
  --auth $TRANSCEND_API_KEY \
  --partition <partition-uuid> \
  --directory ./working/<project-name>/output/all_chunks/ \
  --transcendUrl <transcend-url>
```

The interactive flow walks through 6 steps:

1. **Identifier columns** — select email + any secondary identifiers (firstName, lastName)
2. **Identifier mapping** — map each to org identifier names, mark which are unique
3. **Timestamp column** — select the column used for "last preference update"
4. **Purpose columns** — select which columns map to purposes/preferences
5. **Value mapping** — map each unique value to opted-in/opted-out/null. Empty strings auto-map to null (no preference). `True`/`False` defaults are auto-detected.
6. **Metadata columns** — select which remaining columns to INCLUDE as metadata (unselected are ignored)

### 3.2 Validate the config

Read the generated `preference-upload-schema.json` and verify:

- **columnToIdentifier**: correct names, `email` marked as unique
- **timestampColumn**: points to the right column
- **columnToPurposeName**: each purpose column maps to correct org purpose, valueMapping includes `"": null` for empty strings
- **columnToMetadata**: country columns or other useful metadata included
- **columnsToIgnore**: consent date columns or other non-upload columns excluded

Compare against any previous upload's config if available.

## Phase 4: Test Upload

### 4.1 Ask the user

- **Test size**: How many records? (default: 100)
- **Corner cases**: Any specific scenarios to verify? (e.g. empty purpose values, records with only one consent type, overlapping source records)
- **Verification links**: Generate Transcend dashboard links for spot-checking

### 4.2 Run test upload

**Important**: The upload command does NOT have a `--file` flag. It processes all CSV files in `--directory`. To upload only a specific file, ensure it's the only CSV in the directory.

Move extra files out of the test directory before uploading:

```bash
cp output/preference-upload-schema.json output/test/
# If batch_a_chunk_0001.csv is also in test/, move it out temporarily
mv output/test/batch_a_chunk_0001.csv output/test/batch_a_chunk_0001.csv.bak
```

First do a dry run:

```bash
pnpm start consent upload-preferences \
  --auth $TRANSCEND_API_KEY \
  --partition <partition-uuid> \
  --directory ./working/<project-name>/output/test/ \
  --transcendUrl <transcend-url> \
  --concurrency 1 \
  --dryRun
```

Verify: `PendingSafe` should equal total rows, `PendingConflicts: 0`, `Skipped: 0`.

Then upload for real (drop `--dryRun`):

```bash
pnpm start consent upload-preferences \
  --auth $TRANSCEND_API_KEY \
  --partition <partition-uuid> \
  --directory ./working/<project-name>/output/test/ \
  --transcendUrl <transcend-url> \
  --concurrency 1
```

Restore the chunk file after test:

```bash
mv output/test/batch_a_chunk_0001.csv.bak output/test/batch_a_chunk_0001.csv
```

### 4.3 Generate verification links

Extract sample emails and build dashboard URLs. URLs must be URL-encoded:

```
https://app.transcend.io/preference-store/user-preferences?filters=%7B%22identifiers%22%3A%5B%7B%22name%22%3A%22email%22%2C%22value%22%3A%22<url-encoded-email>%22%7D%5D%7D
```

Note: `@` encodes to `%40`. Do NOT use raw JSON in the URL — it won't work.

Pick emails covering these scenarios:

- Has both purposes opted-in
- Has one opted-in, one empty (should show no preference for the empty one)
- Has both opted-out
- Has mixed (one opted-in, one opted-out)
- Has metadata (country) populated, especially split-source metadata (different countries)
- From each data source if multiple

### 4.4 API verification script

Create a verification script to query the API directly and validate results programmatically:

```bash
#!/usr/bin/env bash
SOMBRA_URL="https://multi-tenant.sombra.us.transcend.io"  # adjust for EU
PARTITION="<partition-uuid>"

query_email() {
  local email="$1" label="$2"
  echo "=== $label: $email ==="
  curl -s "${SOMBRA_URL}/v1/preferences/${PARTITION}/query" \
    -H "Authorization: Bearer ${TRANSCEND_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"filter\":{\"identifiers\":[{\"name\":\"email\",\"value\":\"${email}\"}]},\"limit\":1}" \
    | python3 -m json.tool 2>/dev/null || echo "(failed to parse)"
  echo ""
}

query_email "user@example.com" "BOTH_OPTED_IN"
# ... add more scenarios
```

Run: `TRANSCEND_API_KEY=<key> bash verify_upload.sh`

Check that for each record:

- `purposes` array has correct `enabled` values
- Empty source values result in purpose being **absent** (not `enabled: false`)
- `identifiers` include email, firstName, lastName
- `metadata` has correct country values
- `timestamp` matches source CSV
- `decryptionStatus` is `DECRYPTED`, `confirmed` is `true`

Present results to user and ask them to verify before proceeding.

## Phase 5: Full Upload

### 5.1 Key flags for production uploads

> **Important**: For large uploads (>1M records), dry-run and per-record verification
> dramatically slow uploads. For production runs of this scale, skip `--dryRun` and
> verify via sampling after completion.

Critical flags:

- **`--skipExistingRecordCheck`**: ALWAYS use for initial uploads or when the partition is empty/nearly empty. Without this, the uploader downloads existing preferences for every identifier in the file to check for conflicts — extremely slow on large datasets.
- **`--skipWorkflowTriggers`**: ALWAYS use for bulk imports. Without this, every record triggers workflows on the Transcend side, adding massive overhead and contributing to rate limiting. Only omit if workflows must fire per-record.
- **`--chunkSizeMB 0`**: Use when files are already pre-chunked to skip auto-chunking.
- **`--concurrency`**: Omit to auto-detect from CPU cores (typically 10-12). Each worker also makes `--uploadConcurrency` (default 75) parallel API requests with `--maxChunkSize` (default 25) records each. Total records in flight = `concurrency × uploadConcurrency × maxChunkSize`.

### 5.2 Copy config and run

```bash
cp output/preference-upload-schema.json output/batch_a/
cp output/preference-upload-schema.json output/batch_b/

# Upload batch_a first (earliest timestamps)
pnpm start consent upload-preferences \
  --auth $TRANSCEND_API_KEY \
  --partition <partition-uuid> \
  --directory ./working/<project-name>/output/batch_a/ \
  --transcendUrl <transcend-url> \
  --skipExistingRecordCheck \
  --skipWorkflowTriggers \
  --chunkSizeMB 0

# Then batch_b (later timestamps, overwrites where needed)
pnpm start consent upload-preferences \
  --auth $TRANSCEND_API_KEY \
  --partition <partition-uuid> \
  --directory ./working/<project-name>/output/batch_b/ \
  --transcendUrl <transcend-url> \
  --skipExistingRecordCheck \
  --skipWorkflowTriggers \
  --chunkSizeMB 0
```

### 5.3 Monitor progress

The upload command shows a live dashboard with progress, throughput, and errors. Watch for:

- **Rate limit retries**: Normal, the CLI handles these automatically
- **Unmapped value errors**: Indicates a value in the data not covered by the config — will hard-error in non-interactive worker mode
- **Network errors**: Transient, retried automatically up to 5 times
- **"Duplicate primary key" warnings**: Indicates duplicate emails within a single chunk file. The uploader handles these by uploading both with `___<index>` suffix; the API resolves by timestamp. Harmless but indicates the transform script could improve dedup.

### 5.4 Resumability

The upload command writes receipt files. If interrupted, re-running the same command will resume from where it left off, skipping already-uploaded chunks.

## Phase 6: Error Analysis & Cleanup

If errors occur during upload:

1. Check the logs directory for detailed error output:
   - `<directory>/logs/worker-N.err.log` — per-worker error logs
   - `<directory>/../receipts/combined-errors.log` — aggregated errors
   - `<directory>/../receipts/combined-all.log` — full output with stack traces
2. Common issues:
   - **Unmapped values**: Add missing mappings to `preference-upload-schema.json` and re-run
   - **Unmapped columns**: Ensure all CSV columns are accounted for in the config as either identifiers, purposes, metadata, timestamp, or `columnsToIgnore`
   - **Invalid identifiers**: Check for malformed emails in source data
   - **Rate limits**: Reduce `--concurrency` or `--uploadConcurrency` and retry
3. Failed chunks can be re-uploaded by re-running the command (receipt-based resumption skips completed chunks)

## Phase 7: Executive Summary

After upload completes, produce a summary including:

```markdown
# Preference Upload Summary — <Project Name>

## Source Data

- **Sources**: <list sources and record counts>
- **Exclusion list**: <count> emails filtered
- **Records dropped** (no timestamp): <count>

## Upload Results

- **batch_a**: <count> records across <N> chunks
- **batch_b**: <count> records across <N> chunks
- **Total unique emails**: <count>
- **Errors**: <count> (detail any persistent failures)

## Configuration

- **Purposes mapped**: <list>
- **Identifiers**: <list>
- **Metadata**: <list>

## Verification

- **Test upload**: <count> records verified via dashboard
- **Sample checks**: <list verification links and results>

## Timing

- Transform: ~Xm
- Chunking: ~Xm
- Config generation: ~Xm
- Upload batch_a: ~Xh Xm
- Upload batch_b: ~Xh Xm
```

Post the summary as a comment on the associated Linear ticket.
