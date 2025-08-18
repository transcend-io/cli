import { keyBy } from 'lodash-es';
import {
  ScopeName,
  TRANSCEND_SCOPES,
  type ScopeDefinition,
} from '@transcend-io/privacy-types';
import { TranscendPullResource } from './enums';
import { TranscendInput } from './codecs';

export { description, version } from '../package.json';
/**
 * The name of the main binary for the CLI
 */
export const name = 'transcend';

export const ADMIN_DASH = 'https://app.transcend.io';

export const ADMIN_DASH_INTEGRATIONS = `${ADMIN_DASH}/infrastructure/integrations`;
export const ADMIN_DASH_DATAPOINTS = `${ADMIN_DASH}/data-map/data-inventory/data-points`;

/**
 * Override default transcend API url using
 * TRANSCEND_API_URL=https://api.us.transcend.io transcend ...
 */
export const DEFAULT_TRANSCEND_API =
  process.env.TRANSCEND_API_URL || 'https://api.transcend.io';

/**
 * Override default transcend API url using
 * TRANSCEND_CONSENT_API_URL=https://consent.us.transcend.io transcend ...
 */
export const DEFAULT_TRANSCEND_CONSENT_API =
  process.env.TRANSCEND_CONSENT_API_URL || 'https://consent.transcend.io';

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
  [TranscendPullResource.ProcessingActivities]: [ScopeName.ManageDataMap],
  [TranscendPullResource.Identifiers]: [ScopeName.ManageRequestIdentities],
  [TranscendPullResource.Attributes]: [ScopeName.ManageGlobalAttributes],
  [TranscendPullResource.DataFlows]: [ScopeName.ManageDataFlow],
  [TranscendPullResource.Cookies]: [ScopeName.ManageDataFlow],
  [TranscendPullResource.ConsentManager]: [
    ScopeName.ManageConsentManagerDeveloperSettings,
  ],
  [TranscendPullResource.Partitions]: [
    ScopeName.ManageConsentManagerDeveloperSettings,
  ],
  [TranscendPullResource.Actions]: [ScopeName.ManageDataSubjectRequestSettings],
  [TranscendPullResource.DataSubjects]: [
    ScopeName.ManageDataSubjectRequestSettings,
  ],
  [TranscendPullResource.Prompts]: [ScopeName.ManagePrompts],
  [TranscendPullResource.PromptPartials]: [ScopeName.ManagePrompts],
  [TranscendPullResource.PromptGroups]: [ScopeName.ManagePrompts],
  [TranscendPullResource.Agents]: [ScopeName.ManagePathfinder],
  [TranscendPullResource.AgentFunctions]: [ScopeName.ManagePathfinder],
  [TranscendPullResource.AgentFiles]: [ScopeName.ManagePathfinder],
  [TranscendPullResource.Vendors]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.DataCategories]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.ProcessingPurposes]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.ActionItems]: [
    ScopeName.ManageAllActionItems,
    ScopeName.ViewGlobalAttributes,
  ],
  [TranscendPullResource.ActionItemCollections]: [
    ScopeName.ManageActionItemCollections,
  ],
  [TranscendPullResource.Teams]: [ScopeName.ManageAccessControl],
  [TranscendPullResource.Messages]: [ScopeName.ManageIntlMessages],
  [TranscendPullResource.PrivacyCenters]: [ScopeName.ManagePrivacyCenter],
  [TranscendPullResource.Policies]: [ScopeName.ManagePolicies],
  [TranscendPullResource.Assessments]: [ScopeName.ManageAssessments],
  [TranscendPullResource.AssessmentTemplates]: [ScopeName.ManageAssessments],
  [TranscendPullResource.Purposes]: [
    ScopeName.ManageConsentManager,
    ScopeName.ManagePreferenceStoreSettings,
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
  [TranscendPullResource.ProcessingActivities]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.Identifiers]: [ScopeName.ViewRequestIdentitySettings],
  [TranscendPullResource.Attributes]: [ScopeName.ViewGlobalAttributes],
  [TranscendPullResource.DataFlows]: [ScopeName.ViewDataFlow],
  [TranscendPullResource.Cookies]: [ScopeName.ViewDataFlow],
  [TranscendPullResource.ConsentManager]: [ScopeName.ViewConsentManager],
  [TranscendPullResource.Partitions]: [ScopeName.ViewConsentManager],
  [TranscendPullResource.Actions]: [ScopeName.ViewDataSubjectRequestSettings],
  [TranscendPullResource.DataSubjects]: [
    ScopeName.ViewDataSubjectRequestSettings,
  ],
  [TranscendPullResource.Prompts]: [ScopeName.ViewPrompts],
  [TranscendPullResource.PromptPartials]: [ScopeName.ViewPrompts],
  [TranscendPullResource.PromptGroups]: [ScopeName.ViewPrompts],
  [TranscendPullResource.Agents]: [ScopeName.ViewPathfinder],
  [TranscendPullResource.AgentFunctions]: [ScopeName.ViewPathfinder],
  [TranscendPullResource.AgentFiles]: [ScopeName.ViewPathfinder],
  [TranscendPullResource.Vendors]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.DataCategories]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.ProcessingPurposes]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.ActionItemCollections]: [ScopeName.ViewAllActionItems],
  [TranscendPullResource.ActionItems]: [ScopeName.ViewAllActionItems],
  [TranscendPullResource.Teams]: [ScopeName.ViewScopes],
  [TranscendPullResource.Messages]: [ScopeName.ViewIntlMessages],
  [TranscendPullResource.PrivacyCenters]: [ScopeName.ViewPrivacyCenter],
  [TranscendPullResource.Policies]: [ScopeName.ViewPolicies],
  [TranscendPullResource.Assessments]: [ScopeName.ViewAssessments],
  [TranscendPullResource.AssessmentTemplates]: [ScopeName.ViewAssessments],
  [TranscendPullResource.Purposes]: [
    ScopeName.ViewConsentManager,
    ScopeName.ViewPreferenceStoreSettings,
  ],
};

export const TR_YML_RESOURCE_TO_FIELD_NAME: Record<
  TranscendPullResource,
  keyof TranscendInput
> = {
  [TranscendPullResource.ApiKeys]: 'api-keys',
  [TranscendPullResource.Attributes]: 'attributes',
  [TranscendPullResource.DataFlows]: 'data-flows',
  [TranscendPullResource.Cookies]: 'cookies',
  [TranscendPullResource.ConsentManager]: 'consent-manager',
  [TranscendPullResource.Partitions]: 'partitions',
  [TranscendPullResource.Actions]: 'actions',
  [TranscendPullResource.DataSubjects]: 'data-subjects',
  [TranscendPullResource.BusinessEntities]: 'business-entities',
  [TranscendPullResource.ProcessingActivities]: 'processing-activities',
  [TranscendPullResource.Identifiers]: 'identifiers',
  [TranscendPullResource.Enrichers]: 'enrichers',
  [TranscendPullResource.DataSilos]: 'data-silos',
  [TranscendPullResource.Templates]: 'templates',
  [TranscendPullResource.Prompts]: 'prompts',
  [TranscendPullResource.PromptPartials]: 'prompt-partials',
  [TranscendPullResource.PromptGroups]: 'prompt-groups',
  [TranscendPullResource.Agents]: 'agents',
  [TranscendPullResource.AgentFunctions]: 'agent-functions',
  [TranscendPullResource.AgentFiles]: 'agent-files',
  [TranscendPullResource.Vendors]: 'vendors',
  [TranscendPullResource.DataCategories]: 'data-categories',
  [TranscendPullResource.ProcessingPurposes]: 'processing-purposes',
  [TranscendPullResource.ActionItems]: 'action-items',
  [TranscendPullResource.ActionItemCollections]: 'action-item-collections',
  [TranscendPullResource.Teams]: 'teams',
  [TranscendPullResource.Messages]: 'messages',
  [TranscendPullResource.PrivacyCenters]: 'privacy-center',
  [TranscendPullResource.Policies]: 'policies',
  [TranscendPullResource.Assessments]: 'assessments',
  [TranscendPullResource.AssessmentTemplates]: 'assessment-templates',
  [TranscendPullResource.Purposes]: 'purposes',
};

export const SCOPES_BY_TITLE = keyBy(
  Object.entries(TRANSCEND_SCOPES).map(([name, value]) => ({
    ...value,
    name,
  })),
  'title',
) as Record<
  string,
  ScopeDefinition & {
    /** The camelCased name which identifies the scope */
    name: ScopeName;
  }
>;

export const SCOPE_TITLES = Object.keys(SCOPES_BY_TITLE);

/**
 * HTTP statuses that should be retried *in place* without splitting.
 * 429: Rate-limited
 * 502: Upstream/edge gateway error
 * 329: Reserved for custom infra (kept defensively)
 */
export const RETRYABLE_BATCH_STATUSES = new Set([
  429, 502, 500, 504, 329,
] as const);
