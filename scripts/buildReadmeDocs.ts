import {
  generateHelpTextForAllCommands,
  type Application,
  type CommandContext,
} from '@stricli/core';
import { app } from '@/app';
import fs from 'node:fs';
// import { legacyCommandToModernCommandMap } from '@/cli/legacy-commands';

const helpTextForAllCommands = generateHelpTextForAllCommands(
  app as Application<CommandContext>,
);

const formattedMarkdown: string = helpTextForAllCommands
  .map(
    ([command, helpText]) => `## ${command}\n\n\`\`\`bash\n${helpText}\`\`\``,
  )
  .join('\n');

const readme = fs.readFileSync('README.md', 'utf8');

const newReadme = readme.replace(
  /<!-- COMMANDS_START -->[\s\S]*?<!-- COMMANDS_END -->/g,
  `<!-- COMMANDS_START -->\n${formattedMarkdown}\n<!-- COMMANDS_END -->`,
);

fs.writeFileSync('README.md', newReadme);
