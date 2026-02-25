import { buildCommand } from '@stricli/core';

export const findExactCommand = buildCommand({
  loader: async () => {
    const { findExact } = await import('./impl');
    return findExact;
  },
  parameters: {
    flags: {
      needle: {
        kind: 'parsed',
        parse: String,
        brief: 'The exact string to search for (case-insensitive)',
      },
      root: {
        kind: 'parsed',
        parse: String,
        brief: 'Root directory to search',
        default: '.',
      },
      exts: {
        kind: 'parsed',
        parse: String,
        brief:
          'Comma-separated file extensions to search (without leading dots)',
        default: 'csv,json,txt,ndjson,log',
      },
      noParquet: {
        kind: 'boolean',
        brief: 'Skip parquet file scanning (requires duckdb on PATH)',
        default: false,
      },
      concurrency: {
        kind: 'parsed',
        parse: (v: string) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) {
            throw new Error('concurrency must be a positive number');
          }
          return n;
        },
        brief: 'Max number of files to scan concurrently',
        default: '16',
      },
      maxBytes: {
        kind: 'parsed',
        parse: (v: string) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) {
            throw new Error('maxBytes must be a positive number');
          }
          return n;
        },
        brief:
          'Stop scanning each file after this many bytes (useful for huge files)',
        optional: true,
      },
    },
  },
  docs: {
    brief:
      'Search files for an exact string match across CSV, JSON, text, and parquet files',
    fullDescription: `Recursively searches a directory for files that contain the given needle string (case-insensitive).

Supported file types:
- Text-based files (csv, json, txt, ndjson, log, etc.) are scanned via streaming byte comparison.
- Parquet files are scanned via DuckDB (must be on PATH unless --noParquet is set).

Outputs one matching file path per line to stdout as hits are found.`,
  },
});
