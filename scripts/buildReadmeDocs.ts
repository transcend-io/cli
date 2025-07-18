import { execSync } from 'node:child_process';
import fs from 'node:fs';
import {
  generateHelpTextForAllCommands,
  type Application,
  type CommandContext,
} from '@stricli/core';
import { fdir } from 'fdir';
import { app } from '../src/app';

const documentFiles = new fdir()
  .withRelativePaths()
  .glob('**/readme.ts')
  .crawl('./src/commands')
  .sync();

// For each src/commands/**/readme.ts file, create a key-value pair of the command and the exported Markdown documentation
const additionalDocumentation: Record<string, string> = Object.fromEntries(
  await Promise.all(
    documentFiles.map(async (file) => {
      const command = `transcend ${file.split('/').slice(0, -1).join(' ')}`;
      const readme = (await import(`../src/commands/${file}`)).default;
      return [command, readme];
    }),
  ),
);

const helpTextForAllCommands = generateHelpTextForAllCommands(
  app as Application<CommandContext>,
);

const formattedMarkdown: string = helpTextForAllCommands
  .map(([command, helpText]) => {
    let commandDocumentation = `### \`${command}\`\n\n\`\`\`txt\n${helpText}\`\`\``;
    if (additionalDocumentation[command]) {
      commandDocumentation += `\n\n${additionalDocumentation[command]}`;
    }
    return commandDocumentation;
  })
  .join('\n');

const readme = fs.readFileSync('README.md', 'utf8');

const newReadme = readme.replaceAll(
  /<!-- COMMANDS_START -->[\s\S]*?<!-- COMMANDS_END -->/g,
  `<!-- COMMANDS_START -->\n${formattedMarkdown}\n<!-- COMMANDS_END -->`,
);

fs.writeFileSync('README.md', newReadme);

execSync('doctoc README.md --title "\n## Table of Contents" --maxlevel 5', {
  stdio: 'inherit',
});
execSync('prettier --write README.md', { stdio: 'inherit' });
