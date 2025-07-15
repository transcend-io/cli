import { describe, expect, test } from 'vitest';
import {
  getHelpTextForCommand,
  legacyCommandToModernCommandMap,
} from '../cli/legacy-commands';

describe('legacy command mappings', () => {
  // Get all legacy commands that have modern command mappings
  const mappedCommands: {
    /** The legacy command */
    legacyCommand: string;
    /** The modern command */
    modernCommand: string[];
  }[] = [];

  for (const [legacyCommand, modernCommand] of Object.entries(
    legacyCommandToModernCommandMap,
  )) {
    mappedCommands.push({ legacyCommand, modernCommand });
  }

  test.each(mappedCommands)(
    '$legacyCommand maps to modern command',
    ({ modernCommand }) => {
      const helpText = getHelpTextForCommand(modernCommand);
      expect(helpText).toBeDefined();
    },
  );
});
