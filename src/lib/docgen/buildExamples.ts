import { name } from '../../constants';

interface Example<Flags> {
  /** A description of the example */
  description: string;
  /** The command to run */
  flags: Partial<Record<keyof Flags, string>>;
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
      const command = `${name} ${commandPath.join(' ')}`;
      const flagList = Object.entries(example.flags).map(([flag, value]) => {
        if (value === 'true') {
          return `--${flag}`;
        }

        if (typeof value !== 'string') {
          throw new Error(
            `Flag value must be a string for flag ${flag}. Got ${typeof value}`,
          );
        }

        const formattedValue =
          typeof value === 'string' && value.startsWith('$')
            ? `"${value}"`
            : value;

        return `--${flag}=${formattedValue}`;
      });

      // Break the command into multiple lines if it's too long
      const commandWithFlags =
        `${command} ${flagList.join(' ')}`.length <= 117
          ? `${command} ${flagList.join(' ')}`
          : `${command} \\\n  ${flagList.join(' \\\n  ')}`;

      return `**${example.description}**\n\n\`\`\`sh\n${commandWithFlags}\n\`\`\``;
    })
    .join('\n\n');
}
