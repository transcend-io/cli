/**
 * Remove links from a string
 *
 * @param inputString - String
 * @returns String without links
 */
export function removeLinks(inputString: string): string {
  const regex = /(https?:\/\/[^\s]+)/g;
  return inputString.replaceAll(regex, "<link-omitted>");
}
