import { name } from '../../constants';
import { logger } from '../../logger';
import { execSync } from 'node:child_process';

/**
 * The flags of the example command
 * key is the flag name, value is the flag value
 */
type FlagMap<Flags> = Partial<Record<keyof Flags, string>>;

interface Example<Flags> {
  /** A description of the example */
  description: string;
  /** The command to run */
  flags: FlagMap<Flags>;
}

/**
 * Builds a string of examples for the CLI
 *
 * @param commandPath - The path to the command to run, omitting the `transcend` command name, e.g., `['consent', 'upload-preferences']`
 * @param examples - The examples to build
 * @returns A string of examples for the CLI
 */
export function buildExamples<Flags>(
  commandPath: string[],
  examples: Example<Flags>[],
): string {
  return examples
    .map((example) => {
      const exampleCommand = buildExampleCommand(commandPath, example.flags);
      return `**${example.description}**\n\n\`\`\`sh\n${exampleCommand}\n\`\`\``;
    })
    .join('\n\n');
}

/**
 * Builds a command string for an example
 *
 * @param commandPath - The path to the command to run, omitting the `transcend` command name, e.g., `['consent', 'upload-preferences']`
 * @param flags - The flags to build the command with
 * @returns A command string for the example
 */
export function buildExampleCommand<Flags>(
  commandPath: string[],
  flags: FlagMap<Flags>,
): string {
  const command = commandPath.join(' ');
  const flagList = Object.entries(flags).map(([flag, value]) => {
    if (value === 'true') {
      return `--${flag}`;
    }

    if (typeof value !== 'string') {
      throw new Error(
        `Flag value must be a string for flag ${flag}. Got ${typeof value}`,
      );
    }

    const formattedValue =
      typeof value === 'string' &&
      (value.startsWith('$') || value.includes(' '))
        ? `"${value}"`
        : value;

    return `--${flag}=${formattedValue}`;
  });

  // Break the command into multiple lines if it's too long
  const exampleCommand =
    `${name} ${command} ${flagList.join(' ')}`.length <= 117
      ? `${command} ${flagList.join(' ')}`
      : `${command} \\\n  ${flagList.join(' \\\n  ')}`;

  // If `DEVELOPMENT_MODE_VALIDATE_ONLY` is set, test that the example command passes validation
  if (process.env.DEVELOPMENT_MODE_VALIDATE_ONLY) {
    testExampleCommand(command, flagList);
  }

  // Add `transcend` before command name
  return `${name} ${exampleCommand}`;
}

/**
 * Tests an example command
 *
 * @param command - The command to run
 * @param flagList - The flags to run the command with
 */
function testExampleCommand(command: string, flagList: string[]): void {
  const flagListWithReplacedVariables = flagList.map((flag) =>
    flag.replace(
      // Replace bash variables with "test"
      /\$\w+/g,
      'TEST_VALUE',
    ),
  );

  const commandToRun = `pnpm start ${command} ${flagListWithReplacedVariables.join(
    ' ',
  )}`;

  try {
    execSync(commandToRun);
    logger.debug(`Successfully ran command: ${commandToRun}`);
  } catch (error) {
    logger.error(`Failed to run command: ${commandToRun}`);
    process.exit(1);
  }
}
