export type UploadModeTotals = {
  /** The mode of the export, always 'upload' */
  mode: 'upload';
  /** Number of records successfully uploaded */
  success: number;
  /** Number of records skipped */
  skipped: number;
  /** Number of records failed */
  error: number;
  /** Number of records that were not processed */
  errors: Record<string, number>;
};

export type CheckModeTotals = {
  /** The mode of the export, always 'check' */
  mode: 'check';
  /** Number of records pending */
  pendingConflicts: number;
  /** Number of records pending safe */
  pendingSafe: number;
  /** Number of records pending */
  totalPending: number;
  /** Number of records skipped */
  skipped: number;
};

/**
 * Represents the totals for either upload or check mode.
 */
export type AnyTotals = UploadModeTotals | CheckModeTotals;

/**
 * Type guard for UploadModeTotals
 *
 * @param totals - The totals object to check
 * @returns True if the totals object is of type UploadModeTotals, false otherwise
 */
export function isUploadModeTotals(
  totals: unknown,
): totals is UploadModeTotals {
  return (
    typeof totals === 'object' &&
    totals !== null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (totals as any).mode === 'upload'
  );
}

/**
 * Type guard for CheckModeTotals
 *
 * @param totals - The totals object to check
 * @returns True if the totals object is of type CheckModeTotals, false otherwise
 */
export function isCheckModeTotals(totals: unknown): totals is CheckModeTotals {
  return (
    typeof totals === 'object' &&
    totals !== null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (totals as any).mode === 'check'
  );
}
