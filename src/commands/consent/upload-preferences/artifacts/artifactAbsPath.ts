import { join, resolve } from 'node:path';
import type { LogExportKind } from '../../../../lib/pooling';

export interface ExportArtifactStatus {
  /** The absolute path to the export artifact */
  path: string;
  /** The timestamp when the artifact was saved */
  savedAt?: number;
  /** Whether the artifact was successfully exported */
  exported?: boolean;
}

/**
 * The kind of export artifact to retrieve the path for.
 */
export type ExportKindWithCsv = LogExportKind | 'failures-csv';

/**
 * Get the absolute path for an export artifact based on its kind.
 *
 * @param kind - The kind of export artifact
 * @param exportsDir - Optional directory where exports are stored
 * @param status - Optional status of the export artifact
 * @returns The absolute path to the export artifact
 */
export function artifactAbsPath(
  kind: ExportKindWithCsv,
  exportsDir?: string,
  status?: ExportArtifactStatus,
): string {
  const fallbackName =
    kind === 'error'
      ? 'combined-errors.log'
      : kind === 'warn'
      ? 'combined-warns.log'
      : kind === 'info'
      ? 'combined-info.log'
      : kind === 'all'
      ? 'combined-all.log'
      : 'failing-updates.csv';

  const rawPath =
    status?.path ||
    (exportsDir ? join(exportsDir, fallbackName) : '(set exportsDir)');
  return rawPath.startsWith('(') ? rawPath : resolve(rawPath);
}
