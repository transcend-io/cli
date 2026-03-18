import { buildCommand } from '@stricli/core';

export const chunkCsvCommand = buildCommand({
  loader: async () => {
    const { chunkCsv } = await import('./impl');
    return chunkCsv;
  },
  parameters: {
    flags: {
      directory: {
        kind: 'parsed',
        parse: String,
        brief: 'Directory containing CSV files to split (required)',
      },
      outputDir: {
        kind: 'parsed',
        parse: String,
        brief:
          "Directory to write chunk files (defaults to each input file's directory)",
        optional: true,
      },
      clearOutputDir: {
        kind: 'boolean',
        brief: 'Clear the output directory before writing chunks',
        default: true,
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
          'Approximate chunk size in megabytes. Keep well under JS string size limits',
        default: '10',
      },
      concurrency: {
        kind: 'parsed',
        parse: (v: string) => Math.max(1, Number(v) || 0),
        brief:
          'Max number of worker processes (defaults based on CPU and file count)',
        optional: true,
      },
      viewerMode: {
        kind: 'boolean',
        brief:
          'Run in non-interactive viewer mode (no attach UI, auto-artifacts)',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Chunk all CSVs in a directory into smaller CSV files',
    fullDescription: `Streams every CSV in --directory and writes chunked files of approximately N MB each.
- Runs files in parallel across worker processes (configurable via --concurrency).
- Validates row-length consistency against the header row; logs periodic progress and memory usage.`,
  },
});
