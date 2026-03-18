import {
  ConsentTrackerStatus,
  ScopeName,
  TRANSCEND_SCOPES,
} from '@transcend-io/privacy-types';
import { TranscendPullResource } from '../../../enums';
import {
  buildExampleCommand,
  buildExamples,
} from '../../../lib/docgen/buildExamples';
import { createPullResourceScopesTable } from '../../../lib/docgen/createPullResourceScopesTable';
import type { PullCommandFlags } from './impl';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl';
import { TR_PULL_RESOURCE_SCOPE_MAP } from '../../../constants';

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
        dataSiloIds: ['710fec3c-7bcc-4c9e-baff-bf39f9bec43e'],
      },
    },
    {
      description: 'Pull specific types of data silos',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        integrationNames: ['salesforce', 'snowflake'],
      },
    },
    {
      description: 'Pull specific resource types',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [
          TranscendPullResource.ApiKeys,
          TranscendPullResource.Templates,
          TranscendPullResource.DataSilos,
          TranscendPullResource.Enrichers,
        ],
      },
    },
    {
      description:
        'Pull data flows and cookies with specific tracker statuses (see [this example](./examples/data-flows-cookies.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [
          TranscendPullResource.DataFlows,
          TranscendPullResource.Cookies,
        ],
        trackerStatuses: [
          ConsentTrackerStatus.NeedsReview,
          ConsentTrackerStatus.Live,
        ],
      },
    },
    {
      description: 'Pull data silos without datapoint information',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.DataSilos],
        skipDatapoints: true,
      },
    },
    {
      description: 'Pull data silos without subdatapoint information',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.DataSilos],
        skipSubDatapoints: true,
      },
    },
    {
      description: 'Pull data silos with guessed categories',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.DataSilos],
        includeGuessedCategories: true,
      },
    },
    {
      description:
        'Pull custom field definitions only (see [this example](./examples/attributes.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.Attributes],
      },
    },
    {
      description:
        'Pull business entities only (see [this example](./examples/business-entities.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.BusinessEntities],
      },
    },
    {
      description:
        'Pull processing activities only (see [this example](./examples/processing-activities.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.ProcessingActivities],
      },
    },
    {
      description:
        'Pull enrichers and identifiers (see [this example](./examples/enrichers.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [
          TranscendPullResource.Enrichers,
          TranscendPullResource.Identifiers,
        ],
      },
    },
    {
      description:
        'Pull onboarding action items (see [this example](./examples/action-items.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [
          TranscendPullResource.ActionItems,
          TranscendPullResource.ActionItemCollections,
        ],
      },
    },
    {
      description:
        'Pull consent manager domain list (see [this example](./examples/consent-manager-domains.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.ConsentManager],
      },
    },
    {
      description:
        'Pull identifier configurations (see [this example](./examples/identifiers.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.Identifiers],
      },
    },
    {
      description:
        'Pull request actions configurations (see [this example](./examples/actions.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.Actions],
      },
    },
    {
      description:
        'Pull consent manager purposes and preference management topics (see [this example](./examples/purposes.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.Purposes],
      },
    },
    {
      description:
        'Pull data subject configurations (see [this example](./examples/data-subjects.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [TranscendPullResource.DataSubjects],
      },
    },
    {
      description:
        'Pull privacy center and internationalized messages (see [this example](./examples/privacy-center-and-messages.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [
          TranscendPullResource.PrivacyCenters,
          TranscendPullResource.Messages,
        ],
      },
    },
    {
      description: 'Pull assessments and assessment templates',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: [
          TranscendPullResource.Assessments,
          TranscendPullResource.AssessmentTemplates,
        ],
      },
    },
    {
      description: 'Pull everything',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        resources: ['all'],
      },
    },
  ],
);

export default `#### Scopes

The API key permissions for this command vary based on the \`resources\` argument:

${createPullResourceScopesTable(TR_PULL_RESOURCE_SCOPE_MAP)}

#### Examples

${examples}

**Pull configuration files across multiple instances**

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(
  ['admin', 'generate-api-keys'],
  {
    email: 'test@transcend.io',
    password: '$TRANSCEND_PASSWORD',
    scopes: [TRANSCEND_SCOPES[ScopeName.ViewConsentManager].title],
    apiKeyTitle: 'CLI Usage Cross Instance Sync',
    file: './transcend-api-keys.json',
  },
)}
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: './transcend-api-keys.json',
  resources: [TranscendPullResource.ConsentManager],
  file: './transcend/',
})}
\`\`\`

Note: This command will overwrite the existing transcend.yml file that you have locally.`;
