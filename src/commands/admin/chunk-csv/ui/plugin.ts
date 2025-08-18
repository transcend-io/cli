import {
  makeHeader,
  makeWorkerRows,
  type ChunkSlotProgress,
  type CommonCtx,
  type DashboardPlugin,
} from '../../../../lib/pooling';

/**
 * Header for chunk-csv (no extra totals block).
 *
 * @param ctx - Dashboard context.
 * @returns Header lines.
 */
function renderHeader<TTotals>(
  ctx: CommonCtx<TTotals, ChunkSlotProgress>,
): string[] {
  // no extra lines — reuse the shared header as-is
  return makeHeader(ctx);
}

/**
 * Worker rows for chunk-csv — share the generic row renderer.
 *
 * @param ctx - Dashboard context.
 * @returns Array of strings, each representing one worker row.
 */
function renderWorkers<TTotals>(
  ctx: CommonCtx<TTotals, ChunkSlotProgress>,
): string[] {
  return makeWorkerRows(ctx);
}

export const chunkCsvPlugin: DashboardPlugin<unknown, ChunkSlotProgress> = {
  renderHeader,
  renderWorkers,
  // no extras
};
