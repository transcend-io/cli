declare module 'fuzzysearch' {
  /**
   * Fuzzy search
   *
   * @param needle - Needle to search
   * @param haystack - Hay to search through
   * @returns True if matching
   */
  export default function fuzzysearch(
    needle: string,
    haystack: string,
  ): boolean;
}
