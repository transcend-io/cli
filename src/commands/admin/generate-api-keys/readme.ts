import { buildExamples } from '../../../lib/docgen/buildExamples';
import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';
import type { GenerateApiKeysCommandFlags } from './impl';

const examples = buildExamples<GenerateApiKeysCommandFlags>(
  ['admin', 'generate-api-keys'],
  [
    {
      description: 'Generate API keys for cross-instance usage',
      flags: {
        email: 'test@transcend.io',
        password: '$TRANSCEND_PASSWORD',
        scopes: `${TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title},${
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title
        }`,
        apiKeyTitle: 'CLI Usage Cross Instance Sync',
        file: './working/auth.json',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        email: 'test@transcend.io',
        password: '$TRANSCEND_PASSWORD',
        scopes: `${TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title},${
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title
        }`,
        apiKeyTitle: 'CLI Usage Cross Instance Sync',
        file: './working/auth.json',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description:
        'Filter for only a specific organization by ID, returning all child accounts associated with that organization',
      flags: {
        email: 'test@transcend.io',
        password: '$TRANSCEND_PASSWORD',
        scopes: `${TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title},${
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title
        }`,
        apiKeyTitle: 'CLI Usage Cross Instance Sync',
        file: './working/auth.json',
        parentOrganizationId: '7098bb38-070d-4f26-8fa4-1b61b9cdef77',
      },
    },
    {
      description: 'Delete all API keys with a certain title',
      flags: {
        email: 'test@transcend.io',
        password: '$TRANSCEND_PASSWORD',
        scopes: `${TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title},${
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title
        }`,
        apiKeyTitle: 'CLI Usage Cross Instance Sync',
        file: './working/auth.json',
        createNewApiKey: 'false',
      },
    },
    {
      description:
        'Throw error if an API key already exists with that title, default behavior is to delete the existing API key and create a new one with that same title',
      flags: {
        email: 'test@transcend.io',
        password: '$TRANSCEND_PASSWORD',
        scopes: `${TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title},${
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title
        }`,
        apiKeyTitle: 'CLI Usage Cross Instance Sync',
        file: './working/auth.json',
        deleteExistingApiKey: 'false',
      },
    },
  ],
);

export default `#### Usage

${examples}

**Find your organization ID**

You can use the following GQL query on the [EU GraphQL Playground](https://api.us.transcend.io/graphql) or [US GraphQL Playground](https://api.us.transcend.io/graphql) to get your organization IDs and their parent/child relationships.

\`\`\`gql
query {
  user {
    organization {
      id
      parentOrganizationId
    }
  }
}
\`\`\``;
