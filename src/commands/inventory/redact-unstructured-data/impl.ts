// src/commands/classify/unstructured/impl.ts
import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { rimrafSync } from 'rimraf';
import { join, resolve } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

import {
  computePoolSize,
  createExtraKeyHandler,
  CHILD_FLAG,
  type PoolHooks,
  runPool,
  dashboardPlugin,
} from '../../../lib/pooling';

import {
  runChild,
  type UnstructuredTask,
  type UnstructuredProgress,
  type UnstructuredResult,
} from './worker';
import { classifyUnstructuredPlugin } from './ui';
import {
  buildTranscendGraphQLClient,
  fetchAllDataCategories,
} from '../../../lib/graphql';

export type ClassifyUnstructuredFlags = {
  directory: string;
  outputDir?: string;
  clearOutputDir: boolean;

  // Provided by common-parameters in command.ts
  transcendUrl: string;
  sombraAuth?: string;
  auth: string;

  batchSize: number;

  concurrency?: number;
  viewerMode: boolean;
  writeSidecar: boolean;
};

type Totals = {
  files: number;
  redactions: number;
  errors: number;
};

function getCurrentModulePath(): string {
  // __filename is undefined in ESM; fall back to argv[1]
  return typeof __filename !== 'undefined'
    ? (__filename as unknown as string)
    : process.argv[1];
}

const DEFAULT_EXTS = [
  '.txt',
  '.log',
  '.md',
  '.markdown',
  '.json',
  '.html',
  '.xml',
  '.csv',
  '.tsv',
];

function walkFiles(rootDir: string): string[] {
  const out: string[] = [];
  const stack = [resolve(rootDir)];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const ent of readdirSync(dir)) {
      const p = resolve(dir, ent);
      const s = statSync(p);
      if (s.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function filterByExt(paths: string[]): string[] {
  return paths.filter((p) =>
    DEFAULT_EXTS.some((ext) => p.toLowerCase().endsWith(ext)),
  );
}

export async function classifyUnstructured(
  this: LocalContext,
  flags: ClassifyUnstructuredFlags,
): Promise<void> {
  const baseInputDir = resolve(flags.directory);

  // Discover files
  const all = walkFiles(baseInputDir);
  const files = filterByExt(all);
  if (!files.length) {
    logger.error(
      colors.red(`No matching text-like files found in ${baseInputDir}`),
    );
    this.process.exit(1);
  }

  // Compute outputDir default: <directory>/redacted
  const outputDir = resolve(flags.outputDir ?? join(baseInputDir, 'redacted'));

  // Optionally clear output directory ONCE (avoid per-worker races)
  if (flags.clearOutputDir) {
    try {
      rimrafSync(outputDir);
    } catch (e) {
      logger.warn(`Failed to clear output directory ${outputDir}: ${e}`);
    }
  }

  // Resolve labels from Transcend
  const client = buildTranscendGraphQLClient(flags.transcendUrl, flags.auth);
  const dataCategories = await fetchAllDataCategories(client);

  // Size the pool
  const { poolSize, cpuCount } = computePoolSize(
    flags.concurrency,
    files.length,
  );

  logger.info(
    colors.green(
      `Classifying & redacting ${files.length} file(s) with pool size ${poolSize} (CPU=${cpuCount})`,
    ),
  );

  // Build FIFO queue
  const queue: UnstructuredTask[] = files.map((filePath) => ({
    filePath,
    options: {
      baseInputDir,
      outputDir,
      auth: flags.auth,
      sombraAuth: flags.sombraAuth,
      transcendUrl: flags.transcendUrl,
      dataCategories,
      batchSize: flags.batchSize,
      writeSidecar: flags.writeSidecar,
    },
  }));

  // Pool hooks
  const hooks: PoolHooks<
    UnstructuredTask,
    UnstructuredProgress,
    UnstructuredResult,
    Totals
  > = {
    nextTask: () => queue.shift(),
    taskLabel: (t) => t.filePath,
    initTotals: () => ({ files: files.length, redactions: 0, errors: 0 }),
    initSlotProgress: () => undefined,
    onProgress: (totals, prog) => {
      if (prog?.redactionsDelta) totals.redactions += prog.redactionsDelta;
      return totals;
    },
    onResult: (totals, res) => {
      if (!res.ok) totals.errors += 1;
      return { totals, ok: !!res.ok };
    },
    postProcess: async () => {
      // no-op
    },
  };

  // Launch pool
  await runPool({
    title: 'Classify & Redact Unstructured',
    baseDir: baseInputDir,
    childFlag: CHILD_FLAG,
    childModulePath: getCurrentModulePath(),
    poolSize,
    cpuCount,
    filesTotal: files.length,
    hooks,
    viewerMode: flags.viewerMode,
    render: (input) =>
      dashboardPlugin(input, classifyUnstructuredPlugin, flags.viewerMode),
    extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
      createExtraKeyHandler({ logsBySlot, repaint, setPaused }),
  });
}

/* -------------------------------------------------------------------------------------------------
 * If invoked directly as a child process, enter worker loop
 * ------------------------------------------------------------------------------------------------- */
if (process.argv.includes(CHILD_FLAG)) {
  runChild().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
