import {
  generateHelpTextForAllCommands,
  type Application,
  type CommandContext,
} from '@stricli/core';
import { app } from '@/app';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { additionalDocumentation } from './doc-helpers/additionalDocumentation';

const helpTextForAllCommands = generateHelpTextForAllCommands(
  app as Application<CommandContext>,
);

/**
 * The keys of the `additionalDocumentation` object.
 */
type AdditionalDocumentationKey = keyof typeof additionalDocumentation;
// Used to throw errors on bad keynames in `additionalDocumentation`.
const additionalDocumentationRemaining = new Set<AdditionalDocumentationKey>(
  Object.keys(additionalDocumentation) as AdditionalDocumentationKey[],
);
const formattedMarkdown: string = helpTextForAllCommands
  .map(([command, helpText]) => {
    let commandDocumentation = `### \`${command}\`\n\n\`\`\`txt\n${helpText}\`\`\``;
    if (additionalDocumentation[command as AdditionalDocumentationKey]) {
      commandDocumentation += `\n\n${
        additionalDocumentation[command as AdditionalDocumentationKey]
      }`;
    }
    additionalDocumentationRemaining.delete(
      command as AdditionalDocumentationKey,
    );
    return commandDocumentation;
  })
  .join('\n');
if (additionalDocumentationRemaining.size > 0) {
  throw new Error(
    `Additional documentation was provided for the following commands, but no help text was found for them: ${Array.from(
      additionalDocumentationRemaining,
    )
      .map((key) => `"${key}"`)
      .join(', ')}`,
  );
}

const readme = fs.readFileSync('README.md', 'utf8');

const newReadme = readme.replace(
  /<!-- COMMANDS_START -->[\s\S]*?<!-- COMMANDS_END -->/g,
  `<!-- COMMANDS_START -->\n${formattedMarkdown}\n<!-- COMMANDS_END -->`,
);

fs.writeFileSync('README.md', newReadme);

execSync('doctoc README.md', { stdio: 'inherit' });
execSync('prettier --write README.md', { stdio: 'inherit' });
