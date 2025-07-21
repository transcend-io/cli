import { name } from '../../constants';

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
  const command = `${name} ${commandPath.join(' ')}`;
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
    `${command} ${flagList.join(' ')}`.length <= 117
      ? `${command} ${flagList.join(' ')}`
      : `${command} \\\n  ${flagList.join(' \\\n  ')}`;

  return exampleCommand;
}
