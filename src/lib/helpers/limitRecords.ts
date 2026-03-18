/**
 * Limits the number of records in the returned object to a maximum.
 * For entries beyond the max, sets their value to `true`.
 *
 * @param obj - Object
 * @param max - Maximum number of entries to retain original value.
 * @returns Object with keys mapped to their value or `true` if over the limit.
 */
export function limitRecords<T>(
  obj: Record<string, T>,
  max: number,
): Record<string, T | true> {
  return Object.entries(obj).reduce((acc, [userId, value], i) => {
    acc[userId] = i < max ? value : true;
    return acc;
  }, {} as Record<string, T | true>);
}
