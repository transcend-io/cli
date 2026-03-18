import { buildCommand } from '@stricli/core';

export const findTextInFolderCommand = buildCommand({
  loader: async () => {
    const { findTextInFolder } = await import('./impl');
    return findTextInFolder;
  },
  parameters: {
    flags: {
      needle: {
        kind: 'parsed',
        parse: String,
        brief: 'The text string to search for (case-insensitive)',
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
      'Find a needle in a haystack — search many large files in a folder for a text match',
    fullDescription: `Searches a folder of files for a given text string (case-insensitive).

Useful for finding a needle in a haystack when you have many large files
(e.g. multi-GB CSV exports, JSON dumps, log archives) and need to know
which ones contain a specific value like an email address, ID, or keyword.

Files are streamed so memory stays flat even for very large inputs.
Concurrency is configurable and files are scanned in parallel.

Supported file types:
- Text-based files (csv, json, txt, ndjson, log, etc.) are scanned via streaming byte comparison.
- Parquet files are scanned via DuckDB (must be on PATH unless --noParquet is set).

Outputs one matching file path per line to stdout as hits are found.`,
  },
});
