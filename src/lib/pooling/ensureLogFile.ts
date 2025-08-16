import { closeSync, existsSync, openSync } from 'node:fs';

/**
 * Ensure a log file exists (touch).
 *
 * @param pathStr - the path to the log file
 */
export function ensureLogFile(pathStr: string): void {
  if (!existsSync(pathStr)) {
    const fd = openSync(pathStr, 'a');
    closeSync(fd);
  }
}
