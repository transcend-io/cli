import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { StricliAutoCompleteContext } from '@stricli/auto-complete';
import type { CommandContext } from '@stricli/core';

export interface LocalContext
  extends CommandContext,
    StricliAutoCompleteContext {
  /** The Node.js process object */
  readonly process: NodeJS.Process;
  // ...
}

/**
 * Builds the context for the CLI.
 *
 * @param process - The Node.js process object.
 * @returns The context for the CLI.
 */
export function buildContext(process: NodeJS.Process): LocalContext {
  return {
    process,
    os,
    fs,
    path,
  };
}
