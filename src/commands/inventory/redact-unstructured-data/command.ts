// src/commands/classify/unstructured/command.ts
import { buildCommand } from '@stricli/core';
import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';
import { ScopeName } from '@transcend-io/privacy-types';

export const redactUnstructuredDataCommand = buildCommand({
  loader: async () => {
    // impl will call a helper you provide to fetch data-category labels from Transcend
    // e.g. getNerLabelsOrExit({ transcendUrl, auth, sombraAuth? })
    const { classifyUnstructured } = await import('./impl');
    return classifyUnstructured;
  },
  parameters: {
    flags: {
      directory: {
        kind: 'parsed',
        parse: String,
        brief:
          'Directory with unstructured text files to classify/redact (required)',
      },
      outputDir: {
        kind: 'parsed',
        parse: String,
        brief:
          'Directory to write redacted outputs (defaults to <directory>/redacted)',
        optional: true,
      },
      clearOutputDir: {
        kind: 'boolean',
        brief: 'Clear the output directory before writing',
        default: false,
      },

      // ---- Transcend / Sombra auth & base URL ----
      transcendUrl: createTranscendUrlParameter(),
      sombraAuth: createSombraAuthParameter(), // optional; only for self-hosted Sombra
      auth: createAuthParameter({
        // Pick a conservative scope for read of classifications/config;
        // adjust after you wire the helper. Silo scope likely required.
        scopes: [ScopeName.ViewDataMap], // FIXME: narrow/expand per your labels API
        requiresSiloScope: true,
      }),

      // ---- Request shaping ----
      batchSize: {
        kind: 'parsed',
        parse: (v: string) => Math.max(1, Number(v) || 0),
        brief: 'Number of text chunks to send per request (default 50)',
        default: '50',
      },

      // ---- Concurrency / UI ----
      concurrency: {
        kind: 'parsed',
        parse: (v: string) => Math.max(1, Number(v) || 0),
        brief: 'Max number of worker processes',
        optional: true,
      },
      viewerMode: {
        kind: 'boolean',
        brief: 'Non-interactive viewer mode',
        default: false,
      },
      writeSidecar: {
        kind: 'boolean',
        brief: 'Write a .redaction.json sidecar per output with match details',
        default: true,
      },
    },
  },
  docs: {
    brief:
      'Classify & redact personal data in unstructured text files using Transcend',
    fullDescription:
      "Reads all text files in --directory, fetches data-category labels from Transcend, classifies content via Transcend's Named Entity Recognition endpoint, " +
      'replaces detected values with stable tokens, and writes redacted outputs to --outputDir. Files are processed concurrently across worker processes.',
  },
});
