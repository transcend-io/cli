import { logger } from '../../../../logger';
import type { LocalContext } from '../../../../context';
import { join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

const DEFAULT_GLOBS = [
  '**/*.txt',
  '**/*.log',
  '**/*.md',
  '**/*.json',
  '**/*.html',
  '**/*.xml',
  '**/*.csv',
];

/**
 * Convert a glob pattern to a regex.
 *
 * @param glob - The glob pattern to convert.
 * @returns - The regex that matches the glob pattern.
 */
function globToRegex(glob: string): RegExp {
  // very small glob -> regex (supports **/, *, ?)
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withStars = escaped
    .replace(/\*\*\/?/g, '(?:.+/)?')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  return new RegExp(`^${withStars}$`);
}

/**
 * Walk a directory and return all files.
 *
 * @param dir - The directory to walk.
 * @param files - The array to store files in.
 * @param base - The base directory for relative paths.
 * @returns - An array of file paths.
 */
function walk(dir: string, files: string[] = [], base = dir): string[] {
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, files, base);
    else files.push(p);
  }
  return files;
}

/**
 * Collect matching files from a directory or exit.
 *
 * @param directory - The directory to search.
 * @param ctx - The local context.
 * @param globs - The glob patterns to match.
 * @returns - An array of matching file paths.
 */
export function collectMatchingFilesOrExit(
  directory: string,
  ctx: LocalContext,
  globs?: string[],
): string[] {
  try {
    const all = walk(directory);
    const patterns = (globs && globs.length ? globs : DEFAULT_GLOBS).map(
      globToRegex,
    );
    const matches = all.filter((p) => {
      const rel = p
        .replace(directory.replace(/\/+$/, ''), '')
        .replace(/^\/+/, '');
      return patterns.some((re) => re.test(rel));
    });
    if (!matches.length) {
      logger.error(`No matching files found in ${directory}`);
      ctx.process.exit(1);
    }
    return matches;
  } catch (e) {
    logger.error(`Failed reading directory ${directory}: ${e}`);
    ctx.process.exit(1);
    return [];
  }
}
