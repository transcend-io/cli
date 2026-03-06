export interface ChunkedDateRange {
  /** Chunk start */
  createdAtAfter: Date;
  /** Chunk end */
  createdAtBefore: Date;
}

/**
 * Split a date range into N evenly-spaced chunks.
 *
 * @param after - Start of the date range
 * @param before - End of the date range
 * @param chunks - Number of chunks to split into
 * @returns Array of date range bounds
 */
export function splitDateRange(
  after: Date,
  before: Date,
  chunks: number,
): ChunkedDateRange[] {
  const startMs = after.getTime();
  const endMs = before.getTime();
  const chunkSizeMs = (endMs - startMs) / chunks;
  return Array.from({ length: chunks }, (_, i) => ({
    createdAtAfter: new Date(startMs + chunkSizeMs * i),
    createdAtBefore: new Date(
      i === chunks - 1 ? endMs : startMs + chunkSizeMs * (i + 1),
    ),
  }));
}
