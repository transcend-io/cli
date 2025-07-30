import { Console } from 'node:console';
import { Writable } from 'node:stream';

/**
 * Capture the logs from stdout and stderr.
 *
 * @returns An object with a `restore` method to restore the original stdout and stderr, and a `getLogs` method to get the captured logs.
 */
export function captureLogs(): {
  /** Restore the original stdout and stderr. */
  restore: () => void;
  /** Get the captured logs. */
  getLogs: () => {
    /** The captured stdout. */
    stdout: string;
    /** The captured stderr. */
    stderr: string;
  };
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const streams = {
    stdout: new Writable({
      /**
       *
       * @param chunk - The chunk.
       * @param _ - The encoding.
       * @param callback - The callback.
       */
      write(chunk, _, callback) {
        stdout.push(chunk.toString());
        callback();
      },
    }),
    stderr: new Writable({
      /**
       *
       * @param chunk - The chunk.
       * @param _ - The encoding.
       * @param callback - The callback.
       */
      write(chunk, _, callback) {
        stderr.push(chunk.toString());
        callback();
      },
    }),
  };

  const originalConsole = globalThis.console;
  globalThis.console = new Console(streams);

  const originalStdoutWrite = process.stdout.write;
  process.stdout.write = streams.stdout.write.bind(
    streams.stdout,
  ) as typeof process.stdout.write;

  const originalStderrWrite = process.stderr.write;
  process.stderr.write = streams.stderr.write.bind(
    streams.stderr,
  ) as typeof process.stderr.write;

  return {
    restore: () => {
      globalThis.console = originalConsole;
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    },
    /**
     * Get the captured logs.
     *
     * @returns The captured logs.
     */
    getLogs() {
      return {
        stdout: stdout.join(''),
        stderr: stderr.join(''),
      };
    },
  };
}
