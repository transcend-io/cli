import { buildRouteMap } from '@stricli/core';
import { buildXdiSyncEndpointCommand } from './build-xdi-sync-endpoint/command';
import { consentManagerServiceJsonToYmlCommand } from './consent-manager-service-json-to-yml/command';
import { consentManagersToBusinessEntitiesCommand } from './consent-managers-to-business-entities/command';
import { pullConsentMetricsCommand } from './pull-consent-metrics/command';
import { pullConsentPreferencesCommand } from './pull-consent-preferences/command';
import { updateConsentManagerCommand } from './update-consent-manager/command';
import { uploadConsentPreferencesCommand } from './upload-consent-preferences/command';
import { uploadCookiesFromCsvCommand } from './upload-cookies-from-csv/command';
import { uploadDataFlowsFromCsvCommand } from './upload-data-flows-from-csv/command';
import { uploadPreferencesCommand } from './upload-preferences/command';

export const consentRoutes = buildRouteMap({
  routes: {
    'build-xdi-sync-endpoint': buildXdiSyncEndpointCommand,
    'pull-consent-metrics': pullConsentMetricsCommand,
    'pull-consent-preferences': pullConsentPreferencesCommand,
    'update-consent-manager': updateConsentManagerCommand,
    'upload-consent-preferences': uploadConsentPreferencesCommand,
    'upload-cookies-from-csv': uploadCookiesFromCsvCommand,
    'upload-data-flows-from-csv': uploadDataFlowsFromCsvCommand,
    'upload-preferences': uploadPreferencesCommand,
    'consent-manager-service-json-to-yml':
      consentManagerServiceJsonToYmlCommand,
    'consent-managers-to-business-entities':
      consentManagersToBusinessEntitiesCommand,
  },
  docs: {
    brief: 'Consent commands',
  },
});
