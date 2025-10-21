export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/**
 * Clamp 1..50 per API spec
 *
 * @param n - Number
 * @returns Clamped number
 */
export const clampPageSize = (n?: number): number =>
  Math.max(1, Math.min(50, n ?? 50));

/**
 * TRUE UTC day start (00:00:00Z)
 *
 * @param d - Date
 * @returns Day start
 */
export const startOfUtcDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/**
 * TRUE UTC hour start (HH:00:00Z)
 *
 * @param d - Date
 * @returns Hour start
 */
export const startOfHour = (d: Date): Date =>
  new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
    ),
  );

/**
 * Add ms safely
 *
 * @param d - Date
 * @param ms - Milliseconds to add
 * @returns New date
 */
export const addMs = (d: Date, ms: number): Date => new Date(d.getTime() + ms);

/**
 * Add whole UTC days (exclusive bound helper)
 *
 * @param d - Date
 * @param n - Number of days to add
 * @returns New date
 */
export const addDaysUtc = (d: Date, n: number): Date =>
  new Date(d.getTime() + n * DAY_MS);
