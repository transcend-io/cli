/* eslint-disable no-multi-str -- Break long strings into multiple lines. This syntax is required for the TS compiler to check against MarkdownLink */

import { TRANSCEND_SCOPES, type ScopeName } from '@transcend-io/privacy-types';
import { TranscendPullResource } from '../../enums';
import { TR_YML_RESOURCE_TO_FIELD_NAME } from '../../constants';

/** A markdown link */
type MarkdownLink = `[${string}](https://${string})`;

const RESOURCE_DOCUMENTATION: Record<
  TranscendPullResource,
  {
    /** The description of the resource. */
    description: string;
    /** The markdown links for the resource. */
    markdownLinks: MarkdownLink[];
  }
> = {
  [TranscendPullResource.ApiKeys]: {
    description:
      'API Key definitions assigned to Data Systems (formerly "Data Silos"). API keys cannot be created through the CLI, ' +
      'but you can map API key usage to Data Systems.',
    markdownLinks: [
      '[Developer Tools -> API keys](https://app.transcend.io/infrastructure/api-keys)',
    ],
  },
  [TranscendPullResource.Attributes]: {
    description:
      'Custom Field definitions that define extra metadata for each table in the Admin Dashboard.',
    markdownLinks: [
      '[Custom Fields](https://app.transcend.io/infrastructure/attributes)',
    ],
  },
  [TranscendPullResource.Templates]: {
    description:
      'Email templates. Only template titles can be created and mapped to other resources.',
    markdownLinks: [
      '[DSR Automation -> Email Settings -> Templates]\
(https://app.transcend.io/privacy-requests/email-settings/templates)',
    ],
  },
  [TranscendPullResource.DataSilos]: {
    description: 'The Data System (formerly "Data Silo") definitions.',
    markdownLinks: [
      '[Data Inventory -> Data Systems](https://app.transcend.io/data-map/data-inventory/data-silos)',
      '[Infrastructure -> Integrations](https://app.transcend.io/infrastructure/integrations)',
    ],
  },
  [TranscendPullResource.Enrichers]: {
    description: 'The Privacy Request enricher configurations.',
    markdownLinks: [
      '[DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)',
    ],
  },
  [TranscendPullResource.DataFlows]: {
    description: 'Consent Manager Data Flow definitions.',
    markdownLinks: [
      '[Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows/approved)',
    ],
  },
  [TranscendPullResource.BusinessEntities]: {
    description: 'The business entities in the Data Inventory.',
    markdownLinks: [
      '[Data Inventory -> Business Entities](https://app.transcend.io/data-map/data-inventory/business-entities)',
    ],
  },
  [TranscendPullResource.ProcessingActivities]: {
    description: 'The processing activities in the Data Inventory.',
    markdownLinks: [
      '[Data Inventory -> Processing Activities](https://app.transcend.io/data-map/data-inventory/processing-activities)',
    ],
  },
  [TranscendPullResource.Actions]: {
    description: 'The privacy request action settings.',
    markdownLinks: [
      '[DSR Automation -> Request Settings -> Data Actions]\
(https://app.transcend.io/privacy-requests/settings/data-actions)',
    ],
  },
  [TranscendPullResource.DataSubjects]: {
    description: 'The privacy request data subject settings.',
    markdownLinks: [
      '[DSR Automation -> Request Settings -> Data Subjects]\
(https://app.transcend.io/privacy-requests/settings/data-subjects)',
    ],
  },
  [TranscendPullResource.Identifiers]: {
    description: 'The privacy request identifier configurations.',
    markdownLinks: [
      '[DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)',
    ],
  },
  [TranscendPullResource.Cookies]: {
    description: 'Consent Manager Cookie definitions.',
    markdownLinks: [
      '[Consent Management -> Cookies](https://app.transcend.io/consent-manager/cookies/approved)',
    ],
  },
  [TranscendPullResource.ConsentManager]: {
    description: 'Consent Manager general settings, including domain list.',
    markdownLinks: [
      '[Consent Management -> Developer Settings](https://app.transcend.io/consent-manager/developer-settings)',
    ],
  },
  [TranscendPullResource.Partitions]: {
    description:
      'The partitions in the account (often representative of separate data controllers).',
    markdownLinks: [
      '[Consent Management -> Developer Settings -> Advanced Settings]\
(https://app.transcend.io/consent-manager/developer-settings/advanced-settings)',
    ],
  },
  [TranscendPullResource.Prompts]: {
    description: 'The Transcend AI prompts',
    markdownLinks: [
      '[Prompt Manager -> Browse](https://app.transcend.io/prompts/browse)',
    ],
  },
  [TranscendPullResource.PromptPartials]: {
    description: 'The Transcend AI prompt partials',
    markdownLinks: [
      '[Prompt Manager -> Partials](https://app.transcend.io/prompts/partials)',
    ],
  },
  [TranscendPullResource.PromptGroups]: {
    description: 'The Transcend AI prompt groups',
    markdownLinks: [
      '[Prompt Manager -> Groups](https://app.transcend.io/prompts/groups)',
    ],
  },
  [TranscendPullResource.Agents]: {
    description: 'The agents in Pathfinder.',
    markdownLinks: [
      '[Pathfinder -> Agents](https://app.transcend.io/pathfinder/agents)',
    ],
  },
  [TranscendPullResource.AgentFunctions]: {
    description: 'The agent functions in Pathfinder.',
    markdownLinks: [
      '[Pathfinder -> Agent Functions](https://app.transcend.io/pathfinder/agent-functions)',
    ],
  },
  [TranscendPullResource.AgentFiles]: {
    description: 'The agent files in Pathfinder.',
    markdownLinks: [
      '[Pathfinder -> Agent Files](https://app.transcend.io/pathfinder/agent-files)',
    ],
  },
  [TranscendPullResource.Vendors]: {
    description: 'The vendors in the Data Inventory.',
    markdownLinks: [
      '[Data Inventory -> Vendors](https://app.transcend.io/data-map/data-inventory/vendors)',
    ],
  },
  [TranscendPullResource.DataCategories]: {
    description: 'The data categories in the Data Inventory.',
    markdownLinks: [
      '[Data Inventory -> Data Categories](https://app.transcend.io/data-map/data-inventory/data-categories)',
    ],
  },
  [TranscendPullResource.ProcessingPurposes]: {
    description: 'The processing purposes in the Data Inventory.',
    markdownLinks: [
      '[Data Inventory -> Processing Purposes](https://app.transcend.io/data-map/data-inventory/purposes)',
    ],
  },
  [TranscendPullResource.ActionItems]: {
    description: 'Onboarding-related action items',
    markdownLinks: [
      '[Action Items](https://app.transcend.io/action-items/all)',
    ],
  },
  [TranscendPullResource.ActionItemCollections]: {
    description: 'Onboarding-related action item group names',
    markdownLinks: [
      '[Action Items](https://app.transcend.io/action-items/all)',
    ],
  },
  [TranscendPullResource.Teams]: {
    description: 'Team definitions of users and scope groupings',
    markdownLinks: [
      '[Administration -> Teams](https://app.transcend.io/admin/teams)',
    ],
  },
  [TranscendPullResource.PrivacyCenters]: {
    description: 'The Privacy Center settings.',
    markdownLinks: [
      '[Privacy Center](https://app.transcend.io/privacy-center/general-settings)',
    ],
  },
  [TranscendPullResource.Policies]: {
    description: 'The Privacy Center policies.',
    markdownLinks: [
      '[Privacy Center -> Policies](https://app.transcend.io/privacy-center/policies)',
    ],
  },
  [TranscendPullResource.Messages]: {
    description:
      'Message definitions used across Consent Management, the Privacy Center, email templates and more.',
    markdownLinks: [
      '[Privacy Center -> Messages & Internationalization]\
(https://app.transcend.io/privacy-center/messages-internationalization)',
      '[Consent Management -> Display Settings -> Messages]\
(https://app.transcend.io/consent-manager/display-settings/messages)',
    ],
  },
  [TranscendPullResource.Assessments]: {
    description: 'Assessment responses.',
    markdownLinks: [
      '[Assessments -> Assessments](https://app.transcend.io/assessments/groups)',
    ],
  },
  [TranscendPullResource.AssessmentTemplates]: {
    description: 'Assessment template configurations.',
    markdownLinks: [
      '[Assessment -> Templates](https://app.transcend.io/assessments/form-templates)',
    ],
  },
  [TranscendPullResource.Purposes]: {
    description: 'Consent purposes and related preference management topics.',
    markdownLinks: [
      '[Consent Management -> Regional Experiences -> Purposes]\
(https://app.transcend.io/consent-manager/regional-experiences/purposes)',
    ],
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
      ([resource, { description, markdownLinks }]) =>
        `| \`${resource}\` | \`${
          TR_YML_RESOURCE_TO_FIELD_NAME[resource as TranscendPullResource]
        }\` | ${description} | ${scopeMap[resource as TranscendPullResource]
          .map((scopeName) => TRANSCEND_SCOPES[scopeName].title)
          .join(', ')} | ${markdownLinks.join('<br>')} |`,
    )
    .join('\n')}`;
}

/* eslint-enable no-multi-str */
