import { buildCommand } from '@stricli/core';

export const chunkCsvCommand = buildCommand({
  loader: async () => {
    const { chunkCsvImpl } = await import('./impl');
    return chunkCsvImpl;
  },
  parameters: {
    flags: {
      inputFile: {
        kind: 'parsed',
        parse: String,
        brief: 'Absolute or relative path to the large CSV file to split',
      },
      outputDir: {
        kind: 'parsed',
        parse: String,
        brief:
          "Directory to write chunk files (defaults to the input file's directory)",
        optional: true,
      },
      chunkSizeMB: {
        kind: 'parsed',
        parse: (v: string) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) {
            throw new Error('chunkSizeMB must be a positive number');
          }
          return n;
        },
        brief:
          'Approximate chunk size in megabytes. Keep well under JS string size limits. Default 10MB.',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Chunk a large CSV into smaller CSV files',
    fullDescription: `Chunks a large CSV file into smaller CSV files of approximately N MB each.

Notes:
- The script streams the input CSV and writes out chunks incrementally to avoid high memory usage.
- You may still need to increase Node's memory limit for very large inputs.
- It validates row length consistency against the header row and logs periodic progress/memory usage.`,
  },
});
