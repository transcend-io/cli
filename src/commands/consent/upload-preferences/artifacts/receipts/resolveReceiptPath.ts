import { join } from 'node:path';
import { getFilePrefix } from '../../computeFiles';
import { existsSync, readdirSync, statSync } from 'node:fs';

/**
 * Find the receipt JSON for a given input file (supports suffixes like __1).
 *
 * @param receiptsFolder - Where to look for receipts
 * @param filePath - The input file path to match against
 * @returns The path to the receipt file, or null if not found
 */
export function resolveReceiptPath(
  receiptsFolder: string,
  filePath: string,
): string | null {
  const base = `${getFilePrefix(filePath)}-receipts.json`;
  const exact = join(receiptsFolder, base);
  if (existsSync(exact)) return exact;

  const prefix = `${getFilePrefix(filePath)}-receipts`;
  try {
    const entries = readdirSync(receiptsFolder)
      .filter((n) => n.startsWith(prefix) && n.endsWith('.json'))
      .map((name) => {
        const full = join(receiptsFolder, name);
        let mtime = 0;
        try {
          mtime = statSync(full).mtimeMs;
        } catch {
          // ignore if stat fails
        }
        return { full, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return entries[0]?.full ?? null;
  } catch {
    return null;
  }
}
