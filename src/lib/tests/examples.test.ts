import { describe, expect, test, vi } from 'vitest';
import { fdir } from 'fdir';
import { run } from '@stricli/core';
import { app } from '../../app';
import { buildContext } from '../../context';
import type { Example } from '../docgen/buildExamples';
import { captureLogs } from './helpers/captureLogs';
import { shellcheck } from 'shellcheck';
import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Test setup. Intercept `buildExampleCommand` from readme.ts files and track the commands examples.
 */
// Altered commands to run via stricli `run`
const commandsToTest: string[] = [];
// Unaltered commands as they appear in README.md for shellcheck
const unalteredCommands: string[] = [];
vi.mock(import('../docgen/buildExamples'), async (importOriginal) => {
  const actual = await importOriginal();
  const mockBuildExampleCommand = vi
    .fn()
    .mockImplementation(
      (commandPath: string[], flags: Record<string, string>) => {
        const command = commandPath.join(' ');
        const flagList = actual.getFlagList(flags);

        // Replace bash variables
        const flagListWithReplacedVariables = flagList.map((flag) =>
          flag.replace(
            // Replace bash variables with "TEST_VALUE"
            /\$\w+/g,
            'TEST_VALUE',
          ),
        );

        // Add the command to `commandsToTest` list
        const commandWithoutName = `${command} ${flagListWithReplacedVariables.join(
          ' ',
        )}`;
        commandsToTest.push(commandWithoutName);
        unalteredCommands.push(actual.buildExampleCommand(commandPath, flags));

        return actual.buildExampleCommand(commandPath, flags);
      },
    );

  return {
    ...actual,
    buildExamples: vi
      .fn()
      .mockImplementation(
        (commandPath: string[], examples: Example<unknown>[]) =>
          examples
            .map((example) => {
              const exampleCommand = mockBuildExampleCommand(
                commandPath,
                example.flags,
              );
              return `**${example.description}**\n\n\`\`\`sh\n${exampleCommand}\n\`\`\``;
            })
            .join('\n\n'),
      ),
    buildExampleCommand: mockBuildExampleCommand,
  };
});
// eslint-disable-next-line new-cap
const docFiles = new fdir()
  .withRelativePaths()
  .glob('**/readme.ts')
  .crawl('./src/commands')
  .sync();
// For each src/commands/**/readme.ts file, create a key-value pair of the command and the exported Markdown documentation
await Promise.all(
  docFiles.map(
    async (file) => (await import(`../../commands/${file}`)).default,
  ),
);

describe('Example commands', () => {
  vi.stubEnv('DEVELOPMENT_MODE_VALIDATE_ONLY', 'true');

  test.each(commandsToTest)(
    'Command %j passes input validation',
    async (commandToTest) => {
      let exitCode: number | undefined;

      const logCapturer = captureLogs();

      try {
        await run(
          app,
          commandToTest.split(' '),
          buildContext({
            ...globalThis.process,
            exit: (code?: number) => {
              exitCode = code;
              throw new Error(`Process exited with code ${code}`);
            },
          }),
        );
      } catch (error) {
        // empty
      }

      const { stderr } = logCapturer.getLogs();
      logCapturer.restore();

      if (exitCode === 1) {
        throw new Error(`Failed to run command: ${commandToTest}\n${stderr}`);
      }
    },
  );

  /**
   * Creates a temp file with optional contents.
   *
   * @param contents - The contents of the temp file.
   * @returns The path to the temp file.
   */
  async function createTempFile(contents = ''): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), 'cli-example-script-'));
    const filePath = join(tempDir, 'tempfile.txt');
    await writeFile(filePath, contents);
    return filePath;
  }

  test.each(unalteredCommands)(
    'Command %j passes shellcheck',
    async (unalteredCommand) => {
      const content = `#!/bin/sh\n${unalteredCommand}`;
      const filePath = await createTempFile(content);
      const result = await shellcheck({
        args: [filePath],
      });
      // console.log(result.output.toString());
      expect(result.stdout.toString()).toBe('');
    },
  );
});
