/**
 * Split string to CSV
 *
 * Filter out double commas and spaces like:
 * Dog, Cat -> ['Dog', 'Cat']
 * Dog,,Cat -> ['Dog', 'Cat']
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
