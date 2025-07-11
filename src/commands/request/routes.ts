import { buildRouteMap } from '@stricli/core';
import { approveCommand } from './approve/command';
import { cancelCommand } from './cancel/command';
import { cronRoutes } from './cron/routes';
import { downloadFilesCommand } from './download-files/command';
import { enricherRestartCommand } from './enricher-restart/command';
import { exportCommand } from './export/command';
import { markSilentCommand } from './mark-silent/command';
import { notifyAdditionalTimeCommand } from './notify-additional-time/command';
import { preflightRoutes } from './preflight/routes';
import { rejectUnverifiedIdentifiersCommand } from './reject-unverified-identifiers/command';
import { restartCommand } from './restart/command';
import { skipPreflightJobsCommand } from './skip-preflight-jobs/command';
import { systemRoutes } from './system/routes';
import { uploadCommand } from './upload/command';

export const requestRoutes = buildRouteMap({
  routes: {
    approve: approveCommand,
    upload: uploadCommand,
    'download-files': downloadFilesCommand,
    cancel: cancelCommand,
    restart: restartCommand,
    'notify-additional-time': notifyAdditionalTimeCommand,
    'mark-silent': markSilentCommand,
    'enricher-restart': enricherRestartCommand,
    'reject-unverified-identifiers': rejectUnverifiedIdentifiersCommand,
    export: exportCommand,
    'skip-preflight-jobs': skipPreflightJobsCommand,
    system: systemRoutes,
    preflight: preflightRoutes,
    cron: cronRoutes,
  },
  docs: {
    brief: 'All commands related to DSR requests',
  },
});
