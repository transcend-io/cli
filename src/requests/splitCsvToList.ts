/**
 * Split string to CSV
 *
 * @param value - Value
 * @returns List of values
 */
export function splitCsvToList(value: string): string[] {
  return value
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x);
}