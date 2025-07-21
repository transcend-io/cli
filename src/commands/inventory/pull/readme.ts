import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';
import { TranscendPullResource } from '../../../enums';
import {
  buildExampleCommand,
  buildExamples,
} from '../../../lib/docgen/buildExamples';
import type { PullCommandFlags } from './impl';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl';

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

const examples = buildExamples<PullCommandFlags>(
  ['inventory', 'pull'],
  [
    {
      description: 'Write out file to ./transcend.yml',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Write out file to custom location',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './custom/location.yml',
      },
    },
    {
      description: 'Pull specific data silo by ID',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloIds: '710fec3c-7bcc-4c9e-baff-bf39f9bec43e',
      },
    },
    {
      description: 'Pull specific types of data silos',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        integrationNames: 'salesforce,snowflake',
      },
    },
    {
      description: 'Pull specific resource types',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'apiKeys,templates,dataSilos,enrichers',
      },
    },
    {
      description:
        'Pull data flows and cookies with specific tracker statuses (see [this example](./examples/data-flows-cookies.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'dataFlows,cookies',
        trackerStatuses: 'NEEDS_REVIEW,LIVE',
      },
    },
    {
      description: 'Pull data silos without datapoint information',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'dataSilos',
        skipDatapoints: 'true',
      },
    },
    {
      description: 'Pull data silos without subdatapoint information',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'dataSilos',
        skipSubDatapoints: 'true',
      },
    },
    {
      description: 'Pull data silos with guessed categories',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'dataSilos',
        includeGuessedCategories: 'true',
      },
    },
    {
      description:
        'Pull attribute definitions only (see [this example](./examples/attributes.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'attributes',
      },
    },
    {
      description:
        'Pull business entities only (see [this example](./examples/business-entities.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'businessEntities',
      },
    },
    {
      description:
        'Pull enrichers and identifiers (see [this example](./examples/enrichers.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'enrichers,identifiers',
      },
    },
    {
      description:
        'Pull onboarding action items (see [this example](./examples/action-items.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'actionItems,actionItemCollections',
      },
    },
    {
      description:
        'Pull consent manager domain list (see [this example](./examples/consent-manager-domains.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'consentManager',
      },
    },
    {
      description:
        'Pull identifier configurations (see [this example](./examples/identifiers.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'identifiers',
      },
    },
    {
      description:
        'Pull request actions configurations (see [this example](./examples/actions.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'actions',
      },
    },
    {
      description:
        'Pull consent manager purposes and preference management topics (see [this example](./examples/purposes.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'purposes',
      },
    },
    {
      description:
        'Pull data subject configurations (see [this example](./examples/data-subjects.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'dataSubjects',
      },
    },
    {
      description: 'Pull assessments and assessment templates',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'assessments,assessmentTemplates',
      },
    },
    {
      description: 'Pull everything',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: 'all',
      },
    },
  ],
);

const table = `| Resource | Description | Scopes | Link |\n| --- | --- | --- | --- |\n${Object.entries(
  pullResourceTable,
)
  .map(
    ([resource, { description, scopes, markdownLink }]) =>
      `| ${resource} | ${description} | ${scopes
        .map((scopeName) => TRANSCEND_SCOPES[scopeName].title)
        .join(', ')} | ${markdownLink} |`,
  )
  .join('\n')}`;

export default `#### Scopes

The API key permissions for this command vary based on the \`resources\` argument:

${table}

#### Usage

${examples}

**Pull configuration files across multiple instances**

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(
  ['admin', 'generate-api-keys'],
  {
    email: 'test@transcend.io',
    password: '$TRANSCEND_PASSWORD',
    scopes: TRANSCEND_SCOPES[ScopeName.ViewConsentManager].title,
    apiKeyTitle: 'CLI Usage Cross Instance Sync',
    file: './transcend-api-keys.json',
  },
)}
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: './transcend-api-keys.json',
  resources: 'consentManager',
  file: './transcend/',
})}
\`\`\`

Note: This command will overwrite the existing transcend.yml file that you have locally.`;
