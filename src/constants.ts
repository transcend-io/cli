import { ScopeName } from '@transcend-io/privacy-types';
import { TranscendPullResource } from './enums';

export const ADMIN_DASH = 'https://app.transcend.io';

export const ADMIN_DASH_INTEGRATIONS = `${ADMIN_DASH}/infrastructure/integrations`;

/**
 * Override default transcend API url using
 * TRANSCEND_API_URL=https://api.us.transcend.io tr-pull ...
 */
export const DEFAULT_TRANSCEND_API =
  process.env.TRANSCEND_API_URL || 'https://api.transcend.io';

/**
 * Mapping between resource type and scopes required for cli
 */
export const TR_PUSH_RESOURCE_SCOPE_MAP: {
  [k in TranscendPullResource]: ScopeName[];
} = {
  [TranscendPullResource.ApiKeys]: [ScopeName.ViewApiKeys],
  [TranscendPullResource.Templates]: [ScopeName.ManageEmailTemplates],
  [TranscendPullResource.DataSilos]: [
    ScopeName.ManageDataMap,
    ScopeName.ConnectDataSilos,
  ],
  [TranscendPullResource.Enrichers]: [ScopeName.ManageRequestIdentities],
  [TranscendPullResource.BusinessEntities]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.Identifiers]: [ScopeName.ManageRequestIdentities],
  [TranscendPullResource.Attributes]: [ScopeName.ManageGlobalAttributes],
  [TranscendPullResource.DataFlows]: [ScopeName.ManageDataFlow],
  [TranscendPullResource.Cookies]: [ScopeName.ManageDataFlow],
  [TranscendPullResource.ConsentManager]: [
    ScopeName.ManageConsentManagerDeveloperSettings,
  ],
  [TranscendPullResource.Actions]: [ScopeName.ManageDataSubjectRequestSettings],
  [TranscendPullResource.DataSubjects]: [
    ScopeName.ManageDataSubjectRequestSettings,
  ],
};

/**
 * Mapping between resource type and scopes required for cli
 */
export const TR_PULL_RESOURCE_SCOPE_MAP: {
  [k in TranscendPullResource]: ScopeName[];
} = {
  [TranscendPullResource.ApiKeys]: [ScopeName.ViewApiKeys],
  [TranscendPullResource.Templates]: [ScopeName.ViewEmailTemplates],
  [TranscendPullResource.DataSilos]: [
    ScopeName.ViewDataMap,
    ScopeName.ViewDataSubjectRequestSettings,
  ],
  [TranscendPullResource.Enrichers]: [ScopeName.ViewRequestIdentitySettings],
  [TranscendPullResource.BusinessEntities]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.Identifiers]: [
    ScopeName.ViewDataSubjectRequestSettings,
  ],
  [TranscendPullResource.Attributes]: [ScopeName.ViewGlobalAttributes],
  [TranscendPullResource.DataFlows]: [ScopeName.ViewDataFlow],
  [TranscendPullResource.Cookies]: [ScopeName.ViewDataFlow],
  [TranscendPullResource.ConsentManager]: [ScopeName.ViewConsentManager],
  [TranscendPullResource.Actions]: [ScopeName.ViewDataSubjectRequestSettings],
  [TranscendPullResource.DataSubjects]: [
    ScopeName.ViewDataSubjectRequestSettings,
  ],
};
