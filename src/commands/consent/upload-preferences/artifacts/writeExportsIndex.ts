// artifacts/indexWriter.ts
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { artifactAbsPath, type ExportKindWithCsv } from './artifactAbsPath';
import type { ExportStatusMap } from '../../../../lib/pooling';

let lastIndexFileContents = '';

/**
 * Get the absolute path for an export artifact based on its kind.
 *
 * @param exportsDir - Optional directory where exports are stored
 * @param exportStatus - Optional status of the export artifact
 * @param exportsFile - The name of the exports index file
 * @returns The absolute path to the export artifact
 */
export function writeExportsIndex(
  exportsDir?: string,
  exportStatus?: ExportStatusMap,
  exportsFile = 'exports.index.txt',
): string | undefined {
  if (!exportsDir) return undefined;
  const lines: string[] = ['# Export artifacts — latest paths', ''];

  const kinds: Array<
    [
      ExportKindWithCsv,
      ExportStatusMap[keyof ExportStatusMap] | undefined,
      string,
    ]
  > = [
    ['error', exportStatus?.error, 'Errors log'],
    ['warn', exportStatus?.warn, 'Warnings log'],
    ['info', exportStatus?.info, 'Info log'],
    ['all', exportStatus?.all, 'All logs'],
    ['failures-csv', exportStatus?.failuresCsv, 'Failing updates (CSV)'],
  ];

  for (const [k, st, label] of kinds) {
    const abs = artifactAbsPath(k, exportsDir, st);
    const url = abs.startsWith('(') ? abs : pathToFileURL(abs).href;
    lines.push(`${label}:`);
    lines.push(`  path: ${abs}`);
    lines.push(`  url:  ${url}`);
    lines.push('');
  }

  const content = lines.join('\n');
  const out = join(exportsDir, exportsFile);
  if (content !== lastIndexFileContents) {
    mkdirSync(exportsDir, { recursive: true });
    writeFileSync(out, `${content}\n`, 'utf8');
    lastIndexFileContents = content;
  }
  return out;
}
