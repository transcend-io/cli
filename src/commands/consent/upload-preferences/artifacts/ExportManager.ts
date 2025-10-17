/* eslint-disable no-continue */
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { artifactAbsPath, type ExportKindWithCsv } from './artifactAbsPath';
import {
  copyToClipboard,
  openPath,
  extractBlocks,
  isLogError,
  isLogWarn,
  type ExportArtifactResult,
  type ExportStatusMap,
  type LogExportKind,
  revealInFileManager,
} from '../../../../lib/pooling';
import { readSafe } from '../../../../lib/helpers';

/**
 * Write the exports index file with the latest paths for each export kind.
 */
export class ExportManager {
  constructor(public exportsDir: string) {}

  /**
   * Get the absolute path for an export artifact based on its kind.
   *
   * @param kind - The kind of the export artifact
   * @param exportStatus - The status of the export
   * @returns The absolute path for the export artifact
   */
  artifactPath(
    kind: ExportKindWithCsv,
    exportStatus?: ExportStatusMap,
  ): string {
    return artifactAbsPath(
      kind,
      this.exportsDir,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (exportStatus as any)?.[kind],
    );
  }

  /**
   * Open an export artifact in the default application for that file type.
   *
   * @param kind - The kind of export artifact to open
   * @param status - Optional status of the export artifact
   * @returns An object containing the success status and the path of the artifact
   */
  async open(
    kind: ExportKindWithCsv,
    status?: ExportStatusMap,
  ): Promise<ExportArtifactResult> {
    const path = this.artifactPath(kind, status);
    return { ok: await openPath(path), path };
  }

  /**
   * Reveal an export artifact in the file manager.
   *
   * @param kind - The kind of export artifact to reveal
   * @param status - Optional status of the export artifact
   * @returns An object containing the success status and the path of the artifact
   */
  async reveal(
    kind: ExportKindWithCsv,
    status?: ExportStatusMap,
  ): Promise<ExportArtifactResult> {
    const path = this.artifactPath(kind, status);
    return { ok: await revealInFileManager(path), path };
  }

  /**
   * Copy the absolute path of an export artifact to the clipboard.
   *
   * @param kind - The kind of export artifact to copy
   * @param status - Optional status of the export artifact
   * @returns An object containing the success status and the path of the artifact
   */
  async copy(
    kind: ExportKindWithCsv,
    status?: ExportStatusMap,
  ): Promise<ExportArtifactResult> {
    const path = this.artifactPath(kind, status);
    return { ok: await copyToClipboard(path), path };
  }

  /**
   * Export combined logs from the slot log paths.
   *
   * @param slotLogPaths - A map of slot IDs to their log paths
   * @param kind - The kind of logs to export
   * @returns The absolute path to the combined logs file
   */
  exportCombinedLogs(
    slotLogPaths: Map<
      number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { outPath?: string; errPath?: string; [k: string]: any } | undefined
    >,
    kind: LogExportKind,
  ): string {
    if (!this.exportsDir) throw new Error('exportsDir not set');

    mkdirSync(this.exportsDir, { recursive: true });
    const outPath = resolve(
      this.exportsDir,
      kind === 'error'
        ? 'combined-errors.log'
        : kind === 'warn'
        ? 'combined-warns.log'
        : kind === 'info'
        ? 'combined-info.log'
        : 'combined-all.log',
    );

    const lines: string[] = [];

    for (const [, paths] of slotLogPaths) {
      if (!paths) continue;
      if (kind === 'all') {
        [paths.outPath, paths.errPath, paths.structuredPath]
          .filter(Boolean)
          .forEach((p) => {
            const t = readSafe(p);
            if (t) lines.push(...t.split('\n').filter(Boolean));
          });
        continue;
      }
      if (kind === 'info') {
        const text = readSafe(paths.infoPath) || readSafe(paths.outPath);
        if (text) lines.push(...text.split('\n').filter(Boolean));
        continue;
      }
      if (kind === 'warn') {
        let text = readSafe(paths.warnPath);
        if (!text) {
          const stderr = readSafe(paths.errPath);
          if (stderr) {
            const blocks = extractBlocks(
              stderr,
              (cl) => isLogWarn(cl) && !isLogError(cl),
            );
            if (blocks.length) text = blocks.join('\n\n');
          }
        }
        if (text) lines.push(...text.split('\n').filter(Boolean));
        continue;
      }
      // error
      let text = readSafe(paths.errorPath);
      if (!text) {
        const stderr = readSafe(paths.errPath);
        if (stderr) {
          const blocks = extractBlocks(stderr, (cl) => isLogError(cl));
          if (blocks.length) text = blocks.join('\n\n');
        }
      }
      if (text) lines.push(...text.split('\n').filter(Boolean));
    }

    lines.sort((a, b) => {
      const ta = a.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0] ?? '';
      const tb = b.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0] ?? '';
      return ta.localeCompare(tb);
    });

    writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
    return outPath;
  }
}
/* eslint-enable no-continue */
