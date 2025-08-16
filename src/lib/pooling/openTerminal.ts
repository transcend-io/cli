// openTerminal.ts
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

/**
 *
 * @param p
 */
export function shellEscape(p: string): string {
  return `'${String(p).replace(/'/g, "'\\''")}'`;
}

/**
 *
 * @param paths
 * @param title
 * @param isSilent
 */
export function openLogTailWindowMulti(
  paths: string[],
  title: string,
  isSilent: boolean,
): void {
  if (isSilent) return;
  const p = platform();
  try {
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
  } catch {}
}
