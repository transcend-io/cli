export const PROCESS_CHUNKED_PREFERENCES_README = `# Process Chunked Preferences

This command processes chunked CSV files containing preference data by:
1. Filtering out records that already have birthDate in metadata
2. Transforming records by moving birthDate from top-level field to metadata JSON object
3. Optionally uploading the transformed files to the Preference Store

## Use Cases

- Migrating birthDate data from identifier fields to metadata
- Batch processing large preference datasets that have been pre-chunked
- Avoiding duplicate updates for records that have already been migrated

## How It Works

### 1. Filtering
Records are filtered BEFORE transformation to skip unnecessary processing:
- If a record's metadata contains \`birthDate\`, it's filtered out (already migrated)
- Invalid JSON in metadata fields triggers a warning but continues processing

### 2. Transformation
For records that pass the filter:
- Parse the existing \`metadata\` JSON string
- Add or update the \`birthDate\` field in the metadata object
- Serialize back to JSON string format

### 3. Output
Transformed records are written to new CSV files with \`-transformed\` suffix:
- Input: \`working/chunks/chunk-001.csv\`
- Output: \`working/transformed/chunk-001-transformed.csv\`

### 4. Upload (Optional)
When \`--upload\` flag is provided:
- Each transformed file is uploaded using \`uploadPreferenceManagementPreferencesInteractive\`
- Uploads run in parallel with configurable concurrency
- Receipt files are generated for each upload

## Examples

### Process only (no upload)
\`\`\`bash
tr-cli admin process-chunked-preferences \\
  --partition ea94a7f1-3c66-434d-a463-934a4ea66b3a \\
  --chunks-dir ./working/chunks \\
  --output-dir ./working/transformed
\`\`\`

### Process and upload
\`\`\`bash
tr-cli admin process-chunked-preferences \\
  --partition ea94a7f1-3c66-434d-a463-934a4ea66b3a \\
  --chunks-dir ./working/chunks \\
  --output-dir ./working/transformed \\
  --upload \\
  --concurrency 5
\`\`\`

### Dry run
\`\`\`bash
tr-cli admin process-chunked-preferences \\
  --partition ea94a7f1-3c66-434d-a463-934a4ea66b3a \\
  --chunks-dir ./working/chunks \\
  --upload \\
  --dry-run
\`\`\`

## Input Format

Expected CSV structure:
\`\`\`csv
userId,email,birthDate,metadata,timestamp,...
user@example.com,user@example.com,1990-01-15,"{}",2024-01-01T00:00:00Z,...
\`\`\`

## Output Format

Transformed CSV with birthDate moved to metadata:
\`\`\`csv
userId,email,birthDate,metadata,timestamp,...
user@example.com,user@example.com,1990-01-15,"{\"birthDate\":\"1990-01-15\"}",2024-01-01T00:00:00Z,...
\`\`\`

## Statistics

The command provides detailed statistics:
- Total records processed
- Records that passed the filter
- Records filtered out (already have birthDate in metadata)
- Records successfully transformed
- Upload success/failure counts

## Error Handling

- Invalid JSON in metadata fields: Warning logged, processing continues
- Failed file processing: Logged but doesn't stop other files
- Upload failures: Logged per file, other uploads continue

## Performance

- Streaming architecture: Memory efficient for large files
- Parallel uploads: Configurable concurrency
- Early filtering: Skips unnecessary transformation work
`;
