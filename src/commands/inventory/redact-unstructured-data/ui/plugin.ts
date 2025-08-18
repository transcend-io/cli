import {
  makeHeader,
  makeWorkerRows,
  type CommonCtx,
  type DashboardPlugin,
} from '../../../../lib/pooling';

/**
 * No progress
 */
export type UnstructuredSlotProgress = {
  /** The file currently being processed. */
  filePath: string;
  /** Bytes processed so far (approximate; based on chunk lengths). */
  processedBytes?: number;
  /** Incremental number of redactions detected since previous tick. */
  redactionsDelta?: number;
  /** Total bytes in the input file. */
  totalBytes?: number;
};

function renderHeader<TTotals>(
  ctx: CommonCtx<TTotals, UnstructuredSlotProgress>,
): string[] {
  // Reuse shared header
  return makeHeader(ctx);
}

function renderWorkers<TTotals>(
  ctx: CommonCtx<TTotals, UnstructuredSlotProgress>,
): string[] {
  return makeWorkerRows(ctx);
}

export const classifyUnstructuredPlugin: DashboardPlugin<
  unknown,
  UnstructuredSlotProgress
> = {
  renderHeader,
  renderWorkers,
};
