import { describe, expect, test } from 'vitest';
import {
  getHelpTextForCommand,
  LEGACY_COMMAND_TO_MODERN_COMMAND_MAP,
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
    LEGACY_COMMAND_TO_MODERN_COMMAND_MAP,
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
