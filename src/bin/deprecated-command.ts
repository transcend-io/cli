#!/usr/bin/env node
import { logModernCommandRecommendation } from '../lib/cli/legacy-commands';

/**
 * Runs when a deprecated command is called.
 */
function main(): void {
  const command = process.argv.at(-1);
  const legacyCommand = command?.split('/').pop()?.trim();
  if (legacyCommand) {
    logModernCommandRecommendation(legacyCommand);
  } else {
    throw new Error('Deprecated command');
  }

  process.exit(1);
}

main();
