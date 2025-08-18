/* eslint-disable no-multi-str -- Break long strings into multiple lines. This syntax is required for the TS compiler to check against markdownLink */

import { TRANSCEND_SCOPES, type ScopeName } from '@transcend-io/privacy-types';
import { TranscendPullResource } from '../../enums';
import { TR_YML_RESOURCE_TO_FIELD_NAME } from '../../constants';

const RESOURCE_DOCUMENTATION: Record<
  TranscendPullResource,
  {
    /** The description of the resource. */
    description: string;
    /** The markdown link to the resource. */
    markdownLink: `[${string}](https://${string})`;
  }
> = {
  [TranscendPullResource.ApiKeys]: {
    description:
      'API Key definitions assigned to Data Systems (formerly "Data Silos"). API keys cannot be created through the CLI, ' +
      'but you can map API key usage to Data Systems.',
    markdownLink:
      '[Developer Tools -> API keys](https://app.transcend.io/infrastructure/api-keys)',
  },
  [TranscendPullResource.Attributes]: {
    description:
      'Custom Field definitions that define extra metadata for each table in the Admin Dashboard.',
    markdownLink:
      '[Custom Fields](https://app.transcend.io/infrastructure/attributes)',
  },
  [TranscendPullResource.Templates]: {
    description:
      'Email templates. Only template titles can be created and mapped to other resources.',
    markdownLink:
      '[DSR Automation -> Email Settings -> Templates]\
(https://app.transcend.io/privacy-requests/email-settings/templates)',
  },
  [TranscendPullResource.DataSilos]: {
    description: 'The Data System (formerly "Data Silo") definitions.',
    markdownLink:
      '[Data Inventory -> Data Systems](https://app.transcend.io/data-map/data-inventory/data-silos)',
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
    description: 'The business entities in the Data Inventory.',
    markdownLink:
      '[Data Inventory -> Business Entities](https://app.transcend.io/data-map/data-inventory/business-entities)',
  },
  [TranscendPullResource.ProcessingActivities]: {
    description: 'The processing activities in the Data Inventory.',
    markdownLink:
      '[Data Inventory -> Processing Activities](https://app.transcend.io/data-map/data-inventory/processing-activities)',
  },
  [TranscendPullResource.Actions]: {
    description: 'The privacy request action settings.',
    markdownLink:
      '[DSR Automation -> Request Settings -> Data Actions]\
(https://app.transcend.io/privacy-requests/settings/data-actions)',
  },
  [TranscendPullResource.DataSubjects]: {
    description: 'The privacy request data subject settings.',
    markdownLink:
      '[DSR Automation -> Request Settings -> Data Subjects]\
(https://app.transcend.io/privacy-requests/settings/data-subjects)',
  },
  [TranscendPullResource.Identifiers]: {
    description: 'The privacy request identifier configurations.',
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
      '[Consent Management -> Developer Settings -> Advanced Settings]\
(https://app.transcend.io/consent-manager/developer-settings/advanced-settings)',
  },
  [TranscendPullResource.Prompts]: {
    description: 'The Transcend AI prompts',
    markdownLink:
      '[Prompt Manager -> Browse](https://app.transcend.io/prompts/browse)',
  },
  [TranscendPullResource.PromptPartials]: {
    description: 'The Transcend AI prompt partials',
    markdownLink:
      '[Prompt Manager -> Partials](https://app.transcend.io/prompts/partials)',
  },
  [TranscendPullResource.PromptGroups]: {
    description: 'The Transcend AI prompt groups',
    markdownLink:
      '[Prompt Manager -> Groups](https://app.transcend.io/prompts/groups)',
  },
  [TranscendPullResource.Agents]: {
    description: 'The agents in Pathfinder.',
    markdownLink:
      '[Pathfinder -> Agents](https://app.transcend.io/pathfinder/agents)',
  },
  [TranscendPullResource.AgentFunctions]: {
    description: 'The agent functions in Pathfinder.',
    markdownLink:
      '[Pathfinder -> Agent Functions](https://app.transcend.io/pathfinder/agent-functions)',
  },
  [TranscendPullResource.AgentFiles]: {
    description: 'The agent files in Pathfinder.',
    markdownLink:
      '[Pathfinder -> Agent Files](https://app.transcend.io/pathfinder/agent-files)',
  },
  [TranscendPullResource.Vendors]: {
    description: 'The vendors in the Data Inventory.',
    markdownLink:
      '[Data Inventory -> Vendors](https://app.transcend.io/data-map/data-inventory/vendors)',
  },
  [TranscendPullResource.DataCategories]: {
    description: 'The data categories in the Data Inventory.',
    markdownLink:
      '[Data Inventory -> Data Categories](https://app.transcend.io/data-map/data-inventory/data-categories)',
  },
  [TranscendPullResource.ProcessingPurposes]: {
    description: 'The processing purposes in the Data Inventory.',
    markdownLink:
      '[Data Inventory -> Processing Purposes](https://app.transcend.io/data-map/data-inventory/purposes)',
  },
  [TranscendPullResource.ActionItems]: {
    description: 'Onboarding-related action items',
    markdownLink: '[Action Items](https://app.transcend.io/action-items/all)',
  },
  [TranscendPullResource.ActionItemCollections]: {
    description: 'Onboarding-related action item group names',
    markdownLink: '[Action Items](https://app.transcend.io/action-items/all)',
  },
  [TranscendPullResource.Teams]: {
    description: 'Team definitions of users and scope groupings',
    markdownLink:
      '[Administration -> Teams](https://app.transcend.io/admin/teams)',
  },
  [TranscendPullResource.PrivacyCenters]: {
    description: 'The Privacy Center settings.',
    markdownLink:
      '[Privacy Center](https://app.transcend.io/privacy-center/general-settings)',
  },
  [TranscendPullResource.Policies]: {
    description: 'The Privacy Center policies.',
    markdownLink:
      '[Privacy Center -> Policies](https://app.transcend.io/privacy-center/policies)',
  },
  [TranscendPullResource.Messages]: {
    description:
      'Message definitions used across Consent Management, the Privacy Center, email templates and more.',
    markdownLink:
      '[Privacy Center -> Messages & Internationalization]\
(https://app.transcend.io/privacy-center/messages-internationalization), \
[Consent Management -> Display Settings -> Messages]\
(https://app.transcend.io/consent-manager/display-settings/messages)',
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
      '[Consent Management -> Regional Experiences -> Purposes]\
(https://app.transcend.io/consent-manager/regional-experiences/purposes)',
  },
};

/**
 * Builds a markdown table of resource scopes for the readme
 *
 * @param scopeMap - A map from scopes to resources
 * @returns A string markdown table of resource scopes
 */
export function createPullResourceScopesTable(
  scopeMap: Record<TranscendPullResource, ScopeName[]>,
): string {
  return `| Resource | Key in \`transcend.yml\` | Description | Scopes | Link |
| --- | --- | --- | --- | --- |\n${Object.entries(RESOURCE_DOCUMENTATION)
    .map(
      ([resource, { description, markdownLink }]) =>
        `| \`${resource}\` | \`${
          TR_YML_RESOURCE_TO_FIELD_NAME[resource as TranscendPullResource]
        }\` | ${description} | ${scopeMap[resource as TranscendPullResource]
          .map((scopeName) => TRANSCEND_SCOPES[scopeName].title)
          .join(', ')} | ${markdownLink} |`,
    )
    .join('\n')}`;
}

/* eslint-enable no-multi-str */
