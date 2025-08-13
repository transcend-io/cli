/* eslint-disable max-lines */
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

export const RESOURCE_DOCUMENTATION: Record<
  TranscendPullResource,
  {
    /** The description of the resource. */
    description: string;
    /** The markdown link to the resource. */
    markdownLink: string;
  }
> = {
  [TranscendPullResource.ApiKeys]: {
    description:
      'API Key definitions assigned to Data Silos. API keys cannot be created through the CLI, ' +
      'but you can map API key usage to Data Silos.',
    markdownLink:
      '[Developer Tools -> API keys](https://app.transcend.io/infrastructure/api-keys)',
  },
  [TranscendPullResource.Attributes]: {
    description:
      'Custom field definitions that define extra metadata for each table in the Admin Dashboard.',
    markdownLink:
      '[Custom Fields](https://app.transcend.io/infrastructure/attributes)',
  },
  [TranscendPullResource.Templates]: {
    description:
      'Email templates. Only template titles can be created and mapped to other resources.',
    markdownLink:
      '[DSR Automation -> Email Templates](https://app.transcend.io/privacy-requests/email-templates)',
  },
  [TranscendPullResource.DataSilos]: {
    description: 'The Data Silo/Integration definitions.',
    markdownLink:
      '[Data Inventory -> Data Silos](https://app.transcend.io/data-map/data-inventory/) and ' +
      '[Infrastucture -> Integrations](https://app.transcend.io/infrastructure/integrationsdata-silos)',
  },
  [TranscendPullResource.Enrichers]: {
    description: 'The Privacy Request enricher configurations.',
    markdownLink:
      '[DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)',
  },
  [TranscendPullResource.DataFlows]: {
    description: 'Consent Manager Data Flow definitions.',
    markdownLink:
      '[Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows/approved)',
  },
  [TranscendPullResource.BusinessEntities]: {
    description: 'The business entities in the data inventory.',
    markdownLink:
      '[Data Inventory -> Business Entities](https://app.transcend.io/data-map/data-inventory/business-entities)',
  },
  [TranscendPullResource.ProcessingActivities]: {
    description: 'The processing activities in the data inventory.',
    markdownLink:
      '[Data Inventory -> Processing Activities](https://app.transcend.io/data-map/data-inventory/processing-activities)',
  },
  [TranscendPullResource.Actions]: {
    description: 'The Privacy Request action settings.',
    markdownLink:
      '[DSR Automation -> Request Settings](https://app.transcend.io/privacy-requests/settings)',
  },
  [TranscendPullResource.DataSubjects]: {
    description: 'The Privacy Request data subject settings.',
    markdownLink:
      '[DSR Automation -> Request Settings](https://app.transcend.io/privacy-requests/settings)',
  },
  [TranscendPullResource.Identifiers]: {
    description: 'The Privacy Request identifier configurations.',
    markdownLink:
      '[DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)',
  },
  [TranscendPullResource.Cookies]: {
    description: 'Consent Manager Cookie definitions.',
    markdownLink:
      '[Consent Management -> Cookies](https://app.transcend.io/consent-manager/cookies/approved)',
  },
  [TranscendPullResource.ConsentManager]: {
    description: 'Consent Manager general settings, including domain list.',
    markdownLink:
      '[Consent Management -> Developer Settings](https://app.transcend.io/consent-manager/developer-settings)',
  },
  [TranscendPullResource.Partitions]: {
    description:
      'The partitions in the account (often representative of separate data controllers).',
    markdownLink:
      '[Consent Management -> Developer Settings -> Advanced Settings]' +
      '(https://app.transcend.io/consent-manager/developer-settings/advanced-settings)',
  },
  [TranscendPullResource.Prompts]: {
    description: 'The Transcend AI prompts',
    markdownLink:
      '[Prompt Manager -> Browse](https://app.transcend.io/prompts/browse)',
  },
  [TranscendPullResource.PromptPartials]: {
    description: 'The Transcend AI prompt partials',
    markdownLink:
      '[Prompt Manager -> Partials](https://app.transcend.io/prompts/partialss)',
  },
  [TranscendPullResource.PromptGroups]: {
    description: 'The Transcend AI prompt groups',
    markdownLink:
      '[Prompt Manager -> Groups](https://app.transcend.io/prompts/groups)',
  },
  [TranscendPullResource.Agents]: {
    description: 'The agents in the prompt manager.',
    markdownLink:
      '[Prompt Manager -> Agents](https://app.transcend.io/prompts/agents)',
  },
  [TranscendPullResource.AgentFunctions]: {
    description: 'The agent functions in the prompt manager.',
    markdownLink:
      '[Prompt Manager -> Agent Functions](https://app.transcend.io/prompts/agent-functions)',
  },
  [TranscendPullResource.AgentFiles]: {
    description: 'The agent files in the prompt manager.',
    markdownLink:
      '[Prompt Manager -> Agent Files](https://app.transcend.io/prompts/agent-files)',
  },
  [TranscendPullResource.Vendors]: {
    description: 'The vendors in the data inventory.',
    markdownLink:
      '[Data Inventory -> Vendors](https://app.transcend.io/data-map/data-inventory/vendors)',
  },
  [TranscendPullResource.DataCategories]: {
    description: 'The data categories in the data inventory.',
    markdownLink:
      '[Data Inventory -> Data Categories](https://app.transcend.io/data-map/data-inventory/data-categories)',
  },
  [TranscendPullResource.ProcessingPurposes]: {
    description: 'The processing purposes in the data inventory.',
    markdownLink:
      '[Data Inventory -> Processing Purposes](https://app.transcend.io/data-map/data-inventory/purposes)',
  },
  [TranscendPullResource.ActionItems]: {
    description: 'Onboarding related action items',
    markdownLink: '[Action Items](https://app.transcend.io/action-items/all)',
  },
  [TranscendPullResource.ActionItemCollections]: {
    description: 'Onboarding related action item group names',
    markdownLink: '[Action Items](https://app.transcend.io/action-items/all)',
  },
  [TranscendPullResource.Teams]: {
    description: 'Team definitions of users and scope groupings',
    markdownLink:
      '[Administration -> Teams](https://app.transcend.io/admin/teams)',
  },
  [TranscendPullResource.PrivacyCenters]: {
    description: 'The privacy center configurations.',
    markdownLink:
      '[Privacy Center](https://app.transcend.io/privacy-center/general-settings)',
  },
  [TranscendPullResource.Policies]: {
    description: 'The privacy center policies.',
    markdownLink:
      '[Privacy Center -> Policies](https://app.transcend.io/privacy-center/policies)',
  },
  [TranscendPullResource.Messages]: {
    description:
      'Message definitions used across consent, privacy center, email templates and more.',
    markdownLink:
      '[Privacy Center -> Messages](https://app.transcend.io/privacy-center/messages-internationalization), ' +
      '[Consent Management -> Display Settings -> Messages]' +
      '(https://app.transcend.io/consent-manager/display-settings/messages)',
  },
  [TranscendPullResource.Assessments]: {
    description: 'Assessment responses.',
    markdownLink:
      '[Assessments -> Assessments](https://app.transcend.io/assessments/groups)',
  },
  [TranscendPullResource.AssessmentTemplates]: {
    description: 'Assessment template configurations.',
    markdownLink:
      '[Assessment -> Templates](https://app.transcend.io/assessments/form-templates)',
  },
  [TranscendPullResource.Purposes]: {
    description: 'Consent purposes and related preference management topics.',
    markdownLink:
      '[Consent Management -> Regional Experiences -> Purposes]' +
      '(https://app.transcend.io/consent-manager/regional-experiences/purposes)',
  },
};

export const SCOPE_DESCRIPTIONS = (scopeMap: {
  [k in TranscendPullResource]: ScopeName[];
}): string =>
  `| Resource | Description | Scopes | Link |\n| --- | --- | --- | --- |\n${Object.entries(
    RESOURCE_DOCUMENTATION,
  )
    .map(
      ([resource, { description, markdownLink }]) =>
        `| ${resource} | ${description} | ${scopeMap[
          resource as TranscendPullResource
        ]
          .map((scopeName) => TRANSCEND_SCOPES[scopeName].title)
          .join(', ')} | ${markdownLink} |`,
    )
    .join('\n')}`;
/* eslint-enable max-lines */
