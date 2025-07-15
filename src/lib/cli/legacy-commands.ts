import {
  generateHelpTextForAllCommands,
  type Application,
  type CommandContext,
} from '@stricli/core';
import { app } from '../../app';
import { logger } from '@/logger';

// Maps legacy (<7.0.0) command names to their modern command structure
export const legacyCommandToModernCommandMap: Record<string, string[]> = {
  'tr-build-xdi-sync-endpoint': ['consent', 'build-xdi-sync-endpoint'],
  'tr-consent-manager-service-json-to-yml': [
    'inventory',
    'consent-manager-service-json-to-yml',
  ],
  'tr-consent-managers-to-business-entities': [
    'inventory',
    'consent-managers-to-business-entities',
  ],
  'tr-cron-mark-identifiers-completed': [
    'request',
    'cron',
    'mark-identifiers-completed',
  ],
  'tr-cron-pull-identifiers': ['request', 'cron', 'pull-identifiers'],
  'tr-derive-data-silos-from-data-flows': [
    'inventory',
    'derive-data-silos-from-data-flows',
  ],
  'tr-derive-data-silos-from-data-flows-cross-instance': [
    'inventory',
    'derive-data-silos-from-data-flows-cross-instance',
  ],
  'tr-discover-silos': ['inventory', 'discover-silos'],
  'tr-generate-api-keys': ['admin', 'generate-api-keys'],
  'tr-manual-enrichment-pull-identifiers': [
    'request',
    'preflight',
    'pull-identifiers',
  ],
  'tr-manual-enrichment-push-identifiers': [
    'request',
    'preflight',
    'push-identifiers',
  ],
  'tr-mark-request-data-silos-completed': [
    'request',
    'system',
    'mark-request-data-silos-completed',
  ],
  'tr-pull': ['inventory', 'pull'],
  'tr-pull-consent-metrics': ['consent', 'pull-consent-metrics'],
  'tr-pull-consent-preferences': ['consent', 'pull-consent-preferences'],
  'tr-pull-datapoints': ['inventory', 'pull-datapoints'],
  'tr-pull-pull-unstructured-discovery-files': [
    'inventory',
    'pull-unstructured-discovery-files',
  ],
  'tr-push': ['inventory', 'push'],
  'tr-request-approve': ['request', 'approve'],
  'tr-request-cancel': ['request', 'cancel'],
  'tr-request-download-files': ['request', 'download-files'],
  'tr-request-enricher-restart': ['request', 'enricher-restart'],
  'tr-request-export': ['request', 'export'],
  'tr-request-mark-silent': ['request', 'mark-silent'],
  'tr-request-notify-additional-time': ['request', 'notify-additional-time'],
  'tr-request-reject-unverified-identifiers': [
    'request',
    'reject-unverified-identifiers',
  ],
  'tr-request-restart': ['request', 'restart'],
  'tr-request-upload': ['request', 'upload'],
  'tr-retry-request-data-silos': [
    'request',
    'system',
    'retry-request-data-silos',
  ],
  'tr-scan-packages': ['inventory', 'scan-packages'],
  'tr-skip-preflight-jobs': ['request', 'skip-preflight-jobs'],
  'tr-skip-request-data-silos': [
    'request',
    'system',
    'skip-request-data-silos',
  ],
  'tr-sync-ot': ['migration', 'sync-ot'],
  'tr-update-consent-manager': ['consent', 'update-consent-manager'],
  'tr-upload-consent-preferences': ['consent', 'upload-consent-preferences'],
  'tr-upload-cookies-from-csv': ['consent', 'upload-cookies-from-csv'],
  'tr-upload-data-flows-from-csv': ['consent', 'upload-data-flows-from-csv'],
  'tr-upload-preferences': ['consent', 'upload-preferences'],
};

// All commands have been migrated to the modern command structure

/**
 * Gets the help text for a command
 *
 * @param command - The command to get help text for
 * @returns The help text for the command
 */
export function getHelpTextForCommand(command: string[]): string | undefined {
  const helpTextForAllCommands = generateHelpTextForAllCommands(
    app as Application<CommandContext>,
  );

  return helpTextForAllCommands.find(
    (x) => x[0] === `${app.config.name} ${command.join(' ')}`,
  )?.[1];
}

/**
 * Logs a modern command recommendation for a legacy command
 *
 * @param legacyCommand - The legacy command to log a modern command recommendation for
 * @example
 * logModernCommandRecommendation('tr-cron-mark-identifiers-completed');
 */
export function logModernCommandRecommendation(
  legacyCommand: keyof typeof legacyCommandToModernCommandMap,
): void {
  logger.log('[DEPRECATION NOTICE]');

  const modernCommand = legacyCommandToModernCommandMap[legacyCommand];
  if (!modernCommand) {
    const modernCommandString = Object.entries(legacyCommandToModernCommandMap)
      .map(
        ([legacyCommand, modernCommand]) =>
          `\`${legacyCommand}\` -> \`${app.config.name} ${modernCommand.join(
            ' ',
          )}\``,
      )
      .join('\n');
    logger.log(
      'This command is deprecated as of v7.0.0.' +
        ` Here is a list of new commands, mapped to their legacy command names:
${modernCommandString}`,
    );
    return;
  }

  logger.log(
    `\`${legacyCommand}\` is deprecated as of v7.0.0.\nUse \`${
      app.config.name
    } ${modernCommand.join(' ')}\` instead.\n`,
  );

  const helpText = getHelpTextForCommand(modernCommand);
  if (!helpText) {
    throw new Error(
      `Failed to get help text for command: \`${modernCommand.join(' ')}\``,
    );
  }

  logger.log(helpText);
}
