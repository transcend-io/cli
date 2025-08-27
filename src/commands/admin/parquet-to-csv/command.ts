import { buildCommand } from '@stricli/core';

export const parquetToCsvCommand = buildCommand({
  loader: async () => {
    const { parquetToCsv } = await import('./impl');
    return parquetToCsv;
  },
  parameters: {
    flags: {
      directory: {
        kind: 'parsed',
        parse: String,
        brief: 'Directory containing Parquet files to convert (required)',
      },
      outputDir: {
        kind: 'parsed',
        parse: String,
        brief:
          "Directory to write CSV files (defaults to each input file's directory)",
        optional: true,
      },
      clearOutputDir: {
        kind: 'boolean',
        brief: 'Clear the output directory before writing CSVs',
        default: true,
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
    brief:
      'Convert all Parquet files in a directory to CSV (optionally chunked)',
    fullDescription: `Streams every .parquet in --directory and writes CSV output files
- Runs files in parallel across worker processes (configurable via --concurrency).
- Validates row consistency; logs periodic progress and memory usage.`,
  },
});
