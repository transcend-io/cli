import { buildRouteMap } from '@stricli/core';
import { buildXdiSyncEndpointCommand } from './build-xdi-sync-endpoint/command';
import { pullConsentMetricsCommand } from './pull-consent-metrics/command';
import { pullConsentPreferencesCommand } from './pull-consent-preferences/command';
import { updateConsentManagerCommand } from './update-consent-manager/command';
import { uploadConsentPreferencesCommand } from './upload-consent-preferences/command';
import { uploadCookiesFromCsvCommand } from './upload-cookies-from-csv/command';
import { uploadDataFlowsFromCsvCommand } from './upload-data-flows-from-csv/command';
import { uploadPreferencesCommand } from './upload-preferences/command';
import { generateAccessTokensCommand } from './generate-access-tokens/command';

export const consentRoutes = buildRouteMap({
  routes: {
    'build-xdi-sync-endpoint': buildXdiSyncEndpointCommand,
    'generate-access-tokens': generateAccessTokensCommand,
    'pull-consent-metrics': pullConsentMetricsCommand,
    'pull-consent-preferences': pullConsentPreferencesCommand,
    'update-consent-manager': updateConsentManagerCommand,
    'upload-consent-preferences': uploadConsentPreferencesCommand,
    'upload-cookies-from-csv': uploadCookiesFromCsvCommand,
    'upload-data-flows-from-csv': uploadDataFlowsFromCsvCommand,
    'upload-preferences': uploadPreferencesCommand,
  },
  docs: {
    brief: 'Consent commands',
  },
});
