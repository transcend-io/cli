import { name } from '../../constants';

export interface Example<Flags> {
  /** A description of the example */
  description: string;
  /** The command to run */
  flags: Partial<Flags>;
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
  flags: Partial<Flags>,
): string {
  const command = commandPath.join(' ');
  const flagList = getFlagList(flags);

  // Break the command into multiple lines if it's too long
  const exampleCommand =
    `${name} ${command} ${flagList.join(' ')}`.length <= 117
      ? `${command} ${flagList.join(' ')}`
      : `${command} \\\n  ${flagList.join(' \\\n  ')}`;

  // Add `transcend` before command name
  return `${name} ${exampleCommand}`;
}

/**
 * Formats a flag value to the bash string for an example command
 *
 * @param value - The value to format
 * @param depth - The depth of the recursion
 * @returns The formatted value
 */
function formatFlagValue(value: unknown, depth = 0): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value) && depth === 0) {
    const values = value.map((v) => formatFlagValue(v, depth + 1));
    if (values.every((x) => x.startsWith('$') || x.includes(' '))) {
      return `"${values.join(',')}"`;
    }
    return values.join(',');
  }

  if (typeof value === 'string') {
    // If we're operating on list elements
    if (depth === 1) {
      if (value.startsWith('$')) {
        return `$\{${value.slice(1)}}`;
      }
      return value;
    }

    // Escape strings that start with $ or contain spaces or special characters
    return value.startsWith('$') || value.includes(' ') ? `"${value}"` : value;
  }

  throw new Error(`Unsupported value type: ${typeof value}`);
}

/**
 * Builds a list of flags formatted for an example command
 *
 * @param flags - The flags to build the command with
 * @param depth - The depth of the recursion
 * @returns A list of flags for the example command
 */
export function getFlagList<Flags>(flags: Partial<Flags>, depth = 0): string[] {
  return Object.entries(flags).map(([flag, value]) => {
    if (typeof value === 'boolean' && value) {
      // For true booleans, just pass the flag alone
      return `--${flag}`;
    }

    const formattedValue = formatFlagValue(value, depth);

    return `--${flag}=${formattedValue}`;
  });
}
