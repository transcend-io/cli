import * as fs from 'node:fs';
import path from 'node:path';
import {
  generateHelpTextForAllCommands,
  type Application,
  type CommandContext,
} from '@stricli/core';
import { describe, expect, test } from 'vitest';
import { app } from '../../app';

const allCommands: string[][] = generateHelpTextForAllCommands(
  app as Application<CommandContext>,
).map((command) => command[0].split(' ').slice(1));

// Helper function to convert kebab-case to camelCase
/**
 * Convert kebab-case to camelCase
 *
 * @param string_ - The string to convert to camelCase
 * @returns The camelCase string
 */
function kebabToCamelCase(string_: string): string {
  return string_.replaceAll(/-([a-z])/g, (_: string, letter: string) =>
    letter.toUpperCase(),
  );
}

// Helper function to get all unique non-leaf node paths
/**
 * Get all unique non-leaf node paths
 *
 * @param commands - The commands to get the non-leaf nodes for
 * @returns The non-leaf nodes
 */
function getNonLeafNodes(commands: string[][]): Set<string> {
  const nonLeafNodes = new Set<string>();

  for (const command of commands) {
    // Add all intermediate paths (not the leaf)
    for (let index = 1; index < command.length; index += 1) {
      const partialPath = command.slice(0, index).join('/');
      nonLeafNodes.add(partialPath);
    }
  }

  return nonLeafNodes;
}

// Helper function to check if a file exists
/**
 * Check if a file exists
 *
 * @param filePath - The file path to check
 * @returns True if the file exists, false otherwise
 */
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

// Helper function to check if a module exports a specific variable
/**
 * Check if a file exports a specific variable
 *
 * @param filePath - The file path to check
 * @param exportName - The export name to check
 * @returns True if the export exists, false otherwise
 */
async function checkExport(
  filePath: string,
  exportName: string,
): Promise<boolean> {
  try {
    // Convert absolute path to relative for import
    const relativePath = path
      .relative(process.cwd(), filePath)
      .replaceAll('\\', '/');

    const module = await import(`../../../${relativePath}`);

    return exportName in module && module[exportName] !== undefined;
  } catch {
    return false;
  }
}

describe('CLI Command Structure', () => {
  describe('Folder structure matches commands', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j has corresponding folder structure',
      (command: string[]) => {
        const commandPath = path.join('src', 'commands', ...command);
        expect(
          fs.existsSync(commandPath),
          `Directory should exist: ${commandPath}`,
        ).toBe(true);
        expect(
          fs.statSync(commandPath).isDirectory(),
          `Should be a directory: ${commandPath}`,
        ).toBe(true);
      },
    );
  });

  describe('Leaf nodes have command.ts and impl.ts', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j has command.ts and impl.ts',
      (command: string[]) => {
        const commandPath = path.join('src', 'commands', ...command);
        const commandFile = path.join(commandPath, 'command.ts');
        const implFile = path.join(commandPath, 'impl.ts');

        expect(
          fileExists(commandFile),
          `command.ts should exist: ${commandFile}`,
        ).toBe(true);
        expect(fileExists(implFile), `impl.ts should exist: ${implFile}`).toBe(
          true,
        );
      },
    );
  });

  describe('Leaf node exports follow naming convention', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j exports correctly named variables',
      async (command: string[]) => {
        const commandName = command.at(-1); // Get the leaf command name
        if (!commandName) {
          throw new Error(
            `Command array should not be empty: ${JSON.stringify(command)}`,
          );
        }

        const camelCaseName = kebabToCamelCase(commandName);

        const commandPath = path.join('src', 'commands', ...command);
        const commandFile = path.join(commandPath, 'command.ts');
        const implFile = path.join(commandPath, 'impl.ts');

        // Check command.ts exports ${camelCase}Command
        const commandExportName = `${camelCaseName}Command`;
        const hasCommandExport = await checkExport(
          commandFile,
          commandExportName,
        );
        expect(
          hasCommandExport,
          `${commandFile} should export ${commandExportName}`,
        ).toBe(true);

        // Check impl.ts exports ${camelCase} (the function)
        // For reserved keywords, allow underscore prefix
        const implExportName = camelCaseName;
        const hasImplExport = await checkExport(implFile, implExportName);
        const hasUnderscoreImplExport = await checkExport(
          implFile,
          `_${implExportName}`,
        );
        expect(
          hasImplExport || hasUnderscoreImplExport,
          `${implFile} should export ${implExportName} or _${implExportName} (for reserved keywords)`,
        ).toBe(true);
      },
    );
  });

  describe('Non-leaf nodes have routes.ts', () => {
    const nonLeafNodes = [...getNonLeafNodes(allCommands)];

    test.each(nonLeafNodes.map((node) => [node]))(
      'Non-leaf node %s has routes.ts',
      (nodePath: string) => {
        const routesFile = path.join('src', 'commands', nodePath, 'routes.ts');
        expect(
          fileExists(routesFile),
          `routes.ts should exist: ${routesFile}`,
        ).toBe(true);
      },
    );
  });

  describe('Non-leaf node exports follow naming convention', () => {
    const nonLeafNodes = [...getNonLeafNodes(allCommands)];

    test.each(nonLeafNodes.map((node) => [node]))(
      'Non-leaf node %s exports correctly named routes',
      async (nodePath: string) => {
        const parts = nodePath.split('/');
        const nodeName = parts.at(-1); // Get the last part of the path
        if (!nodeName) {
          throw new Error(`Node path should not be empty: ${nodePath}`);
        }

        const camelCaseName = kebabToCamelCase(nodeName);

        const routesFile = path.join('src', 'commands', nodePath, 'routes.ts');

        // Check routes.ts exports ${camelCase}Routes
        const routesExportName = `${camelCaseName}Routes`;
        const hasRoutesExport = await checkExport(routesFile, routesExportName);
        expect(
          hasRoutesExport,
          `${routesFile} should export ${routesExportName}`,
        ).toBe(true);
      },
    );
  });

  describe('All commands are kebab-case', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j uses kebab-case naming',
      (command: string[]) => {
        for (const part of command) {
          // Check that the part is kebab-case (lowercase with hyphens, no other characters)
          expect(part).toMatch(/^[a-z]+(-[a-z]+)*$/);
        }
      },
    );
  });

  describe('Root app.ts exists', () => {
    test('app.ts exists at the root', () => {
      const appFile = path.join('src', 'app.ts');
      expect(fileExists(appFile), 'app.ts should exist at src/app.ts').toBe(
        true,
      );
    });

    test('app.ts exports app', async () => {
      const appFile = path.join('src', 'app.ts');
      const hasAppExport = await checkExport(appFile, 'app');
      expect(hasAppExport, 'app.ts should export app').toBe(true);
    });
  });

  describe('Folder structure integrity', () => {
    test('No unexpected files in command directories', () => {
      // Required + optional files in leaf command dirs
      const requiredFiles = ['command.ts', 'impl.ts'];
      const optionalFiles = [
        'readme.ts',
        'helpers.ts',
        'types.ts',
        'constants.ts',
        'worker.ts',
      ];

      // Allowed subdirectories in leaf command dirs
      const allowedDirs = [
        'artifacts',
        'ui',
        'tests',
        '__mocks__',
        '__snapshots__',
      ];

      for (const command of allCommands) {
        const commandPath = path.join('src', 'commands', ...command);

        const entries = fs
          .readdirSync(commandPath, { withFileTypes: true })
          .filter((e) => e.name !== '.DS_Store');

        const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
        const dirNames = entries
          .filter((e) => e.isDirectory())
          .map((e) => e.name);

        // 1) Required files must exist
        for (const req of requiredFiles) {
          expect(
            fileNames.includes(req),
            `${commandPath} is missing required file: ${req}`,
          ).toBe(true);
        }

        // 2) No unexpected files
        const allowedFiles = new Set([...requiredFiles, ...optionalFiles]);
        const unexpectedFiles = fileNames.filter((f) => !allowedFiles.has(f));
        expect(
          unexpectedFiles,
          `${commandPath} has unexpected files: ${unexpectedFiles.join(', ')}`,
        ).toEqual([]);

        // 3) No unexpected directories
        const unexpectedDirs = dirNames.filter((d) => !allowedDirs.includes(d));
        expect(
          unexpectedDirs,
          `${commandPath} has unexpected directories: ${unexpectedDirs.join(
            ', ',
          )}`,
        ).toEqual([]);
      }
    });

    test('No extra files in non-leaf directories', () => {
      const nonLeafNodes = [...getNonLeafNodes(allCommands)];

      for (const nodePath of nonLeafNodes) {
        const directoryPath = path.join('src', 'commands', nodePath);
        const items = fs
          .readdirSync(directoryPath)
          .filter((item) => item !== '.DS_Store');

        // Should contain routes.ts and subdirectories, no other files
        for (const item of items) {
          const itemPath = path.join(directoryPath, item);
          const isDirectory = fs.statSync(itemPath).isDirectory();

          if (!isDirectory) {
            expect(item).toBe('routes.ts');
          }
        }
      }
    });
  });
});
