import { pathToFileURL } from 'node:url';

/**
 *  Generates an OSC 8 hyperlink for terminal output.
 *
 * @param absPath - Absolute path to the file
 * @param label - Optional label for the link
 * @returns A string formatted as an OSC 8 hyperlink
 */
export function osc8Link(absPath: string, label?: string): string {
  if (!absPath || absPath.startsWith('(')) return label ?? absPath; // Skip placeholders
  try {
    const { href } = pathToFileURL(absPath); // file:///… URL
    const OSC = '\u001B]8;;';
    const BEL = '\u0007';
    const text = label ?? absPath; // may contain SGR color codes
    return `${OSC}${href}${BEL}${text}${OSC}${BEL}`;
  } catch {
    return label ?? absPath;
  }
}
