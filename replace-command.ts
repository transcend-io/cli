// Find and replace legacy commands in a .md file
import * as fs from 'fs';
import * as path from 'path';

/**
 * Command mapping from legacy tr-* commands to modern transcend * commands
 */
const COMMAND_MAP: Record<string, string> = {
  'tr-build-xdi-sync-endpoint': 'transcend consent build-xdi-sync-endpoint',
  'tr-consent-manager-service-json-to-yml':
    'transcend inventory consent-manager-service-json-to-yml',
  'tr-consent-managers-to-business-entities':
    'transcend inventory consent-managers-to-business-entities',
  'tr-cron-mark-identifiers-completed':
    'transcend request cron mark-identifiers-completed',
  'tr-cron-pull-identifiers': 'transcend request cron pull-identifiers',
  'tr-derive-data-silos-from-data-flows':
    'transcend inventory derive-data-silos-from-data-flows',
  'tr-derive-data-silos-from-data-flows-cross-instance':
    'transcend inventory derive-data-silos-from-data-flows-cross-instance',
  'tr-discover-silos': 'transcend inventory discover-silos',
  'tr-generate-api-keys': 'transcend admin generate-api-keys',
  'tr-manual-enrichment-pull-identifiers':
    'transcend request preflight pull-identifiers',
  'tr-manual-enrichment-push-identifiers':
    'transcend request preflight push-identifiers',
  'tr-mark-request-data-silos-completed':
    'transcend request system mark-request-data-silos-completed',
  'tr-pull': 'transcend inventory pull',
  'tr-pull-consent-metrics': 'transcend consent pull-consent-metrics',
  'tr-pull-consent-preferences': 'transcend consent pull-consent-preferences',
  'tr-pull-datapoints': 'transcend inventory pull-datapoints',
  'tr-pull-pull-unstructured-discovery-files':
    'transcend inventory pull-unstructured-discovery-files',
  'tr-push': 'transcend inventory push',
  'tr-request-approve': 'transcend request approve',
  'tr-request-cancel': 'transcend request cancel',
  'tr-request-download-files': 'transcend request download-files',
  'tr-request-enricher-restart': 'transcend request enricher-restart',
  'tr-request-export': 'transcend request export',
  'tr-request-mark-silent': 'transcend request mark-silent',
  'tr-request-notify-additional-time':
    'transcend request notify-additional-time',
  'tr-request-reject-unverified-identifiers':
    'transcend request reject-unverified-identifiers',
  'tr-request-restart': 'transcend request restart',
  'tr-request-upload': 'transcend request upload',
  'tr-retry-request-data-silos':
    'transcend request system retry-request-data-silos',
  'tr-scan-packages': 'transcend inventory scan-packages',
  'tr-skip-preflight-jobs': 'transcend request skip-preflight-jobs',
  'tr-skip-request-data-silos':
    'transcend request system skip-request-data-silos',
  'tr-sync-ot': 'transcend migration sync-ot',
  'tr-update-consent-manager': 'transcend consent update-consent-manager',
  'tr-upload-consent-preferences':
    'transcend consent upload-consent-preferences',
  'tr-upload-cookies-from-csv': 'transcend consent upload-cookies-from-csv',
  'tr-upload-data-flows-from-csv':
    'transcend consent upload-data-flows-from-csv',
  'tr-upload-preferences': 'transcend consent upload-preferences',
};

/**
 * Replace legacy commands with modern commands in a markdown file
 *
 * @param filePath - Path to the markdown file to process
 * @param dryRun - If true, only show what would be changed without making changes
 * @returns Promise<void>
 */
function replaceCommandsInFile(filePath: string, dryRun = false): void {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // eslint-disable-next-line no-console
      console.error(`Error: File ${filePath} does not exist`);
      return;
    }

    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let replacements = 0;

    // Replace each legacy command with its modern equivalent
    for (const [oldCommand, newCommand] of Object.entries(COMMAND_MAP)) {
      // Create regex pattern to match the command in various contexts
      // This will match the command whether it's in code blocks, inline code, or plain text
      const regex = new RegExp(
        `(\`?)${oldCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\`?)`,
        'g',
      );

      const matches = newContent.match(regex);
      if (matches) {
        replacements += matches.length;
        newContent = newContent.replace(regex, `$1${newCommand}$2`);
      }
    }

    if (replacements === 0) {
      // eslint-disable-next-line no-console
      console.log(`No legacy commands found in ${filePath}`);
      return;
    }

    if (dryRun) {
      // eslint-disable-next-line no-console
      console.log(
        `[DRY RUN] Would replace ${replacements} legacy commands in ${filePath}`,
      );
      // eslint-disable-next-line no-console
      console.log('Changes that would be made:');

      // Show the differences
      const lines = content.split('\n');
      const newLines = newContent.split('\n');

      for (let i = 0; i < Math.max(lines.length, newLines.length); i += 1) {
        const oldLine = lines[i] || '';
        const newLine = newLines[i] || '';

        if (oldLine !== newLine) {
          // eslint-disable-next-line no-console
          console.log(`Line ${i + 1}:`);
          // eslint-disable-next-line no-console
          console.log(`  - ${oldLine}`);
          // eslint-disable-next-line no-console
          console.log(`  + ${newLine}`);
        }
      }
    } else {
      // Write the updated content back to the file
      fs.writeFileSync(filePath, newContent, 'utf8');
      // eslint-disable-next-line no-console
      console.log(
        `Successfully replaced ${replacements} legacy commands in ${filePath}`,
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error processing file ${filePath}:`, error);
  }
}

/**
 * Process all markdown files in a directory recursively
 *
 * @param directory - Directory to search for markdown files
 * @param dryRun - If true, only show what would be changed without making changes
 * @returns Promise<void>
 */
async function processDirectory(
  directory: string,
  dryRun = false,
): Promise<void> {
  try {
    const files = fs.readdirSync(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and .git directories
        if (file !== 'node_modules' && file !== '.git') {
          await processDirectory(filePath, dryRun);
        }
      } else if (file.endsWith('.md')) {
        replaceCommandsInFile(filePath, dryRun);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error processing directory ${directory}:`, error);
  }
}

/**
 * Main function to handle command line arguments and execute the script
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // eslint-disable-next-line no-console
    console.log('Usage:');
    // eslint-disable-next-line no-console
    console.log('  ts-node replace-command.ts <file-or-directory> [--dry-run]');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('Examples:');
    // eslint-disable-next-line no-console
    console.log('  ts-node replace-command.ts README.md');
    // eslint-disable-next-line no-console
    console.log('  ts-node replace-command.ts README.md --dry-run');
    // eslint-disable-next-line no-console
    console.log('  ts-node replace-command.ts . --dry-run');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('Options:');
    // eslint-disable-next-line no-console
    console.log(
      '  --dry-run    Show what would be changed without making changes',
    );
    return;
  }

  const target = args[0];
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log('Running in dry-run mode - no files will be modified');
    // eslint-disable-next-line no-console
    console.log('');
  }

  try {
    const stat = fs.statSync(target);

    if (stat.isDirectory()) {
      // eslint-disable-next-line no-console
      console.log(`Processing all markdown files in directory: ${target}`);
      await processDirectory(target, dryRun);
    } else if (stat.isFile()) {
      if (!target.endsWith('.md')) {
        // eslint-disable-next-line no-console
        console.log('Warning: Target is not a markdown file');
      }
      replaceCommandsInFile(target, dryRun);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error: ${target} does not exist or is not accessible`);
    process.exit(1);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
});
