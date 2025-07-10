import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';
import { TranscendPullResource } from '@/enums';

// Additional documentation for help text
const pullResourceTable: Record<
  TranscendPullResource,
  {
    /** The description of the resource. */
    description: string;
    /** The scope of the resource. */
    scopes: ScopeName[];
    /** The markdown link to the resource. */
    markdownLink: string;
  }
> = {
  [TranscendPullResource.ApiKeys]: {
    description:
      'API Key definitions assigned to Data Silos. API keys cannot be created through the CLI, ' +
      'but you can map API key usage to Data Silos.',
    scopes: [ScopeName.ViewApiKeys],
    markdownLink:
      '[Developer Tools -> API keys](https://app.transcend.io/infrastructure/api-keys)',
  },
  [TranscendPullResource.Attributes]: {
    description:
      'Custom field definitions that define extra metadata for each table in the Admin Dashboard.',
    scopes: [ScopeName.ViewGlobalAttributes],
    markdownLink:
      '[Custom Fields](https://app.transcend.io/infrastructure/attributes)',
  },
  [TranscendPullResource.Templates]: {
    description:
      'Email templates. Only template titles can be created and mapped to other resources.',
    scopes: [ScopeName.ViewEmailTemplates],
    markdownLink:
      '[DSR Automation -> Email Templates](https://app.transcend.io/privacy-requests/email-templates)',
  },
  [TranscendPullResource.DataSilos]: {
    description: 'The Data Silo/Integration definitions.',
    scopes: [ScopeName.ViewDataMap, ScopeName.ViewDataSubjectRequestSettings],
    markdownLink:
      '[Data Inventory -> Data Silos](https://app.transcend.io/data-map/data-inventory/) and ' +
      '[Infrastucture -> Integrations](https://app.transcend.io/infrastructure/integrationsdata-silos)',
  },
  [TranscendPullResource.Enrichers]: {
    description: 'The Privacy Request enricher configurations.',
    scopes: [ScopeName.ViewRequestIdentitySettings],
    markdownLink:
      '[DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)',
  },
  [TranscendPullResource.DataFlows]: {
    description: 'Consent Manager Data Flow definitions.',
    scopes: [ScopeName.ViewDataFlow],
    markdownLink:
      '[Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows/approved)',
  },
  [TranscendPullResource.BusinessEntities]: {
    description: 'The business entities in the data inventory.',
    scopes: [ScopeName.ViewDataInventory],
    markdownLink:
      '[Data Inventory -> Business Entities](https://app.transcend.io/data-map/data-inventory/business-entities)',
  },
  [TranscendPullResource.Actions]: {
    description: 'The Privacy Request action settings.',
    scopes: [ScopeName.ViewDataSubjectRequestSettings],
    markdownLink:
      '[DSR Automation -> Request Settings](https://app.transcend.io/privacy-requests/settings)',
  },
  [TranscendPullResource.DataSubjects]: {
    description: 'The Privacy Request data subject settings.',
    scopes: [ScopeName.ViewDataSubjectRequestSettings],
    markdownLink:
      '[DSR Automation -> Request Settings](https://app.transcend.io/privacy-requests/settings)',
  },
  [TranscendPullResource.Identifiers]: {
    description: 'The Privacy Request identifier configurations.',
    scopes: [ScopeName.ViewRequestIdentitySettings],
    markdownLink:
      '[DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)',
  },
  [TranscendPullResource.Cookies]: {
    description: 'Consent Manager Cookie definitions.',
    scopes: [ScopeName.ViewDataFlow],
    markdownLink:
      '[Consent Management -> Cookies](https://app.transcend.io/consent-manager/cookies/approved)',
  },
  [TranscendPullResource.ConsentManager]: {
    description: 'Consent Manager general settings, including domain list.',
    scopes: [ScopeName.ViewConsentManager],
    markdownLink:
      '[Consent Management -> Developer Settings](https://app.transcend.io/consent-manager/developer-settings)',
  },
  [TranscendPullResource.Partitions]: {
    description:
      'The partitions in the account (often representative of separate data controllers).',
    scopes: [ScopeName.ViewConsentManager],
    markdownLink:
      '[Consent Management -> Developer Settings -> Advanced Settings]' +
      '(https://app.transcend.io/consent-manager/developer-settings/advanced-settings)',
  },
  [TranscendPullResource.Prompts]: {
    description: 'The Transcend AI prompts',
    scopes: [ScopeName.ViewPrompts],
    markdownLink:
      '[Prompt Manager -> Browse](https://app.transcend.io/prompts/browse)',
  },
  [TranscendPullResource.PromptPartials]: {
    description: 'The Transcend AI prompt partials',
    scopes: [ScopeName.ViewPrompts],
    markdownLink:
      '[Prompt Manager -> Partials](https://app.transcend.io/prompts/partialss)',
  },
  [TranscendPullResource.PromptGroups]: {
    description: 'The Transcend AI prompt groups',
    scopes: [ScopeName.ViewPrompts],
    markdownLink:
      '[Prompt Manager -> Groups](https://app.transcend.io/prompts/groups)',
  },
  [TranscendPullResource.Agents]: {
    description: 'The agents in the prompt manager.',
    scopes: [ScopeName.ViewPrompts],
    markdownLink:
      '[Prompt Manager -> Agents](https://app.transcend.io/prompts/agents)',
  },
  [TranscendPullResource.AgentFunctions]: {
    description: 'The agent functions in the prompt manager.',
    scopes: [ScopeName.ViewPrompts],
    markdownLink:
      '[Prompt Manager -> Agent Functions](https://app.transcend.io/prompts/agent-functions)',
  },
  [TranscendPullResource.AgentFiles]: {
    description: 'The agent files in the prompt manager.',
    scopes: [ScopeName.ViewPrompts],
    markdownLink:
      '[Prompt Manager -> Agent Files](https://app.transcend.io/prompts/agent-files)',
  },
  [TranscendPullResource.Vendors]: {
    description: 'The vendors in the data inventory.',
    scopes: [ScopeName.ViewDataInventory],
    markdownLink:
      '[Data Inventory -> Vendors](https://app.transcend.io/data-map/data-inventory/vendors)',
  },
  [TranscendPullResource.DataCategories]: {
    description: 'The data categories in the data inventory.',
    scopes: [ScopeName.ViewDataInventory],
    markdownLink:
      '[Data Inventory -> Data Categories](https://app.transcend.io/data-map/data-inventory/data-categories)',
  },
  [TranscendPullResource.ProcessingPurposes]: {
    description: 'The processing purposes in the data inventory.',
    scopes: [ScopeName.ViewDataInventory],
    markdownLink:
      '[Data Inventory -> Processing Purposes](https://app.transcend.io/data-map/data-inventory/purposes)',
  },
  [TranscendPullResource.ActionItems]: {
    description: 'Onboarding related action items',
    scopes: [ScopeName.ViewAllActionItems],
    markdownLink: '[Action Items](https://app.transcend.io/action-items/all)',
  },
  [TranscendPullResource.ActionItemCollections]: {
    description: 'Onboarding related action item group names',
    scopes: [ScopeName.ViewAllActionItems],
    markdownLink: '[Action Items](https://app.transcend.io/action-items/all)',
  },
  [TranscendPullResource.Teams]: {
    description: 'Team definitions of users and scope groupings',
    scopes: [ScopeName.ViewScopes],
    markdownLink:
      '[Administration -> Teams](https://app.transcend.io/admin/teams)',
  },
  [TranscendPullResource.PrivacyCenters]: {
    description: 'The privacy center configurations.',
    scopes: [ScopeName.ViewPrivacyCenter],
    markdownLink:
      '[Privacy Center](https://app.transcend.io/privacy-center/general-settings)',
  },
  [TranscendPullResource.Policies]: {
    description: 'The privacy center policies.',
    scopes: [ScopeName.ViewPolicies],
    markdownLink:
      '[Privacy Center -> Policies](https://app.transcend.io/privacy-center/policies)',
  },
  [TranscendPullResource.Messages]: {
    description:
      'Message definitions used across consent, privacy center, email templates and more.',
    scopes: [ScopeName.ViewIntlMessages],
    markdownLink:
      '[Privacy Center -> Messages](https://app.transcend.io/privacy-center/messages-internationalization), ' +
      // eslint-disable-next-line max-len
      '[Consent Management -> Display Settings -> Messages](https://app.transcend.io/consent-manager/display-settings/messages)',
  },
  [TranscendPullResource.Assessments]: {
    description: 'Assessment responses.',
    scopes: [ScopeName.ViewAssessments],
    markdownLink:
      '[Assessments -> Assessments](https://app.transcend.io/assessments/groups)',
  },
  [TranscendPullResource.AssessmentTemplates]: {
    description: 'Assessment template configurations.',
    scopes: [ScopeName.ViewAssessments],
    markdownLink:
      '[Assessment -> Templates](https://app.transcend.io/assessments/form-templates)',
  },
  [TranscendPullResource.Purposes]: {
    description: 'Consent purposes and related preference management topics.',
    scopes: [
      ScopeName.ViewConsentManager,
      ScopeName.ViewPreferenceStoreSettings,
    ],
    markdownLink:
      '[Consent Management -> Regional Experiences -> Purposes]' +
      '(https://app.transcend.io/consent-manager/regional-experiences/purposes)',
  },
};

export const additionalDocumentation = {
  'transcend inventory pull': `| Resource | Description | Scopes | Link |\n| --- | --- | --- | --- |\n${Object.entries(
    pullResourceTable,
  )
    .map(
      ([resource, { description, scopes, markdownLink }]) =>
        `| ${resource} | ${description} | ${scopes
          .map((scopeName) => TRANSCEND_SCOPES[scopeName].title)
          .join(', ')} | ${markdownLink} |`,
    )
    .join('\n')}`,
};
