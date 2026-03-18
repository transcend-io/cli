import { createReadStream, statSync } from 'node:fs';

/**
 * Replay the tail of a file to stdout.
 *
 * @param path - The absolute path to the file to read.
 * @param maxBytes - The maximum number of bytes to read from the end of the file.
 * @param write - A function to write the output to stdout.
 */
export async function replayFileTailToStdout(
  path: string,
  maxBytes: number,
  write: (s: string) => void,
): Promise<void> {
  await new Promise((resolve) => {
    try {
      const st = statSync(path);
      const start = Math.max(0, st.size - maxBytes);
      const stream = createReadStream(path, { start, encoding: 'utf8' });
      stream.on('data', (chunk) => write(chunk as string));
      stream.on('end', resolve);
      stream.on('error', resolve);
    } catch {
      resolve(undefined);
    }
  });
}
