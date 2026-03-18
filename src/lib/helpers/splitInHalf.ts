/**
 * Split an array roughly in half. Stable for even/odd lengths.
 *
 * @param entries - Items to split
 * @returns A tuple [left, right] halves
 */
export function splitInHalf<T>(entries: T[]): [T[], T[]] {
  const mid = Math.floor(entries.length / 2);
  return [entries.slice(0, mid), entries.slice(mid)];
}
