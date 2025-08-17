import { spawn } from 'node:child_process';

import { dirname } from 'node:path';

/**
 * Spawn a command in a detached process.
 * This is a best-effort attempt to run the command in the background.
 *
 * @param cmd - The command to run
 * @param args - The arguments for the command
 * @returns True if the command was spawned successfully, false otherwise
 */
export function spawnDetached(cmd: string, args: string[]): boolean {
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * Open a path in the default application for that file type.
 *
 * @param p - The path to open
 * @returns True if the path was opened successfully, false otherwise
 */
export function openPath(p: string): boolean {
  if (!p || p.startsWith('(')) return false;
  if (process.platform === 'win32') {
    return spawnDetached('cmd', ['/c', 'start', '', p]);
  }
  return spawnDetached('xdg-open', [p]);
}

/**
 * Reveal a file in the file manager.
 *
 * @param p - The path to the file to reveal
 * @returns True if the file manager was opened successfully, false otherwise
 */
export function revealInFileManager(p: string): boolean {
  if (!p || p.startsWith('(')) return false;
  if (process.platform === 'darwin') return spawnDetached('open', ['-R', p]);
  if (process.platform === 'win32') {
    return spawnDetached('explorer.exe', ['/select,', p]);
  }
  return spawnDetached('xdg-open', [dirname(p)]); // Linux best-effort
}

/**
 * Copy text to the clipboard.
 * This is a best-effort attempt to copy text to the clipboard.
 *
 * @param text - The text to copy to the clipboard
 * @returns True if the text was copied successfully, false otherwise
 */
export function copyToClipboard(text: string): boolean {
  if (!text || text.startsWith('(')) return false;
  try {
    if (process.platform === 'darwin') {
      const p = spawn('pbcopy');
      p.stdin?.end(text);
      return true;
    }
    if (process.platform === 'win32') {
      const p = spawn('clip');
      p.stdin?.end(text.replace(/\n/g, '\r\n'));
      return true;
    }
    try {
      const p = spawn('xclip', ['-selection', 'clipboard']);
      p.stdin?.end(text);
      return true;
    } catch {
      // Fallback to xsel if xclip is not available
    }
    try {
      const p2 = spawn('xsel', ['--clipboard', '--input']);
      p2.stdin?.end(text);
      return true;
    } catch {
      // If both xclip and xsel fail, we can't copy to clipboard
    }
  } catch {
    // If spawning the process fails, we can't copy to clipboard
  }
  return false;
}
