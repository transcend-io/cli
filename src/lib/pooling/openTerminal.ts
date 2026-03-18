import colors from 'colors';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { logger } from '../../logger';

/**
 * Escapes a string for use in a shell command.
 *
 * @param p - The string to escape.
 * @returns The escaped string, suitable for use in a shell command.
 */
export function shellEscape(p: string): string {
  return `'${String(p).replace(/'/g, "'\\''")}'`;
}

/**
 * Opens a new terminal window and tails multiple log files.
 *
 * @param paths - Array of file paths to tail.
 * @param title - Title for the terminal window.
 * @param isSilent - If true, does not open the terminal.
 */
export function openLogTailWindowMulti(
  paths: string[],
  title: string,
  isSilent = false,
): void {
  // If silent mode is enabled, do not open the terminal
  if (isSilent) return;

  // Determine the platform and execute the appropriate command
  const p = platform();
  try {
    // For macOS, use AppleScript to open a new Terminal window
    // and tail the specified files
    if (p === 'darwin') {
      const tails = paths.map(shellEscape).join(' -f ');
      const script = `
        tell application "Terminal"
          activate
          do script "printf '\\e]0;${title}\\a'; tail -n +1 -f ${tails}"
        end tell
      `;
      spawn('osascript', ['-e', script], { stdio: 'ignore', detached: true });
      return;
    }

    // For Windows, use PowerShell to open a new terminal window
    // and tail the specified files
    // The paths are escaped to handle spaces and special characters
    // The command uses Get-Content to tail the files and -Wait to keep the terminal
    if (p === 'win32') {
      const arrayLiteral = `@(${paths
        .map((x) => `'${x.replace(/'/g, "''")}'`)
        .join(',')})`;
      const ps = [
        'powershell',
        '-NoExit',
        '-Command',
        `Write-Host '${title}'; $paths = ${arrayLiteral}; Get-Content -Path $paths -Tail 200 -Wait`,
      ];
      spawn('cmd.exe', ['/c', 'start', ...ps], {
        stdio: 'ignore',
        detached: true,
      }).unref();
      return;
    }

    // For Linux, use gnome-terminal or xterm to open a new terminal window
    // and tail the specified files
    // The paths are escaped to handle spaces and special characters
    const tails = paths.map(shellEscape).join(' -f ');
    try {
      spawn(
        'gnome-terminal',
        [
          '--',
          'bash',
          '-lc',
          `printf '\\e]0;${title}\\a'; tail -n +1 -f ${tails}`,
        ],
        {
          stdio: 'ignore',
          detached: true,
        },
      ).unref();
    } catch {
      spawn(
        'xterm',
        ['-title', title, '-e', `tail -n +1 -f ${paths.join(' ')}`],
        {
          stdio: 'ignore',
          detached: true,
        },
      ).unref();
    }
  } catch (e) {
    logger.error(
      colors.red(
        `Failed to open terminal window for tailing logs: ${
          e instanceof Error ? e.message : String(e)
        }`,
      ),
    );
    throw e;
  }
}
