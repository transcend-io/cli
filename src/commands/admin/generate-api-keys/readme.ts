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
        scopes: [
          TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
        ],
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
        scopes: [
          TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
        ],
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
        scopes: [
          TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
        ],
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
        scopes: [
          TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
        ],
        apiKeyTitle: 'CLI Usage Cross Instance Sync',
        file: './working/auth.json',
        createNewApiKey: false,
      },
    },
    {
      description:
        'Throw error if an API key already exists with that title, default behavior is to delete the existing API key and create a new one with that same title',
      flags: {
        email: 'test@transcend.io',
        password: '$TRANSCEND_PASSWORD',
        scopes: [
          TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
          TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
        ],
        apiKeyTitle: 'CLI Usage Cross Instance Sync',
        file: './working/auth.json',
        deleteExistingApiKey: false,
      },
    },
  ],
);

export default `#### Examples

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
\`\`\`

If you wish to manually construct this api-keys.json file instead of using this command, it should look like the following:

\`\`\`json
[{
  "organizationName": "Acme Corp",
  "apiKey": "a9893544734df8eb8c3bc4925926c9b1f5eb54c8c9a5cc936a11622fbd9fb2da",
  "organizationId": "6a3218db-5703-44eb-8d01-e3ea57ab8e49"
}, {
  "organizationName": "Other Org",
  "apiKey": "bd1d2b6cefeb9233f333271fc4ab14ed96ac71dcbab91fa28c894bb2648d834a",
  "organizationId": "0dc4b936-61ba-43ea-80bf-86471f8e0052"
}]
\`\`\`
`;
