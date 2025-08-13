import {
  buildExampleCommand,
  buildExamples,
} from '../../../lib/docgen/buildExamples';
import type { PushCommandFlags } from './impl';
import type { PullCommandFlags } from '../pull/impl';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl';
import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';
import { TranscendPullResource } from '../../../enums';

const examples = buildExamples<PushCommandFlags>(
  ['inventory', 'push'],
  [
    {
      description: 'Looks for file at ./transcend.yml',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Looks for file at custom location ./custom/location.yml',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './custom/location.yml',
      },
    },
    {
      description: 'Apply service classifier to all data flows',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        classifyService: true,
      },
    },
    {
      description:
        'Push up attributes, deleting any attributes that are not specified in the transcend.yml file',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        deleteExtraAttributeValues: true,
      },
    },
    {
      description:
        'Use dynamic variables to fill out parameters in YAML files (see [./examples/multi-instance.yml](./examples/multi-instance.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        variables: 'domain:acme.com,stage:staging',
      },
    },
  ],
);

export default `#### Scopes

The scopes for \`transcend inventory push\` are similar to the scopes for [\`transcend inventory pull\`](#transcend-inventory-pull). If a
resource requires scope 'View X' in order to pull, 'Manage X' will let you push the resource.

#### Examples

${examples}

**Push a single .yml file configuration into multiple Transcend instances**

This uses the output of [\`transcend admin generate-api-keys\`](#transcend-admin-generate-api-keys).

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(
  ['admin', 'generate-api-keys'],
  {
    email: 'test@transcend.io',
    password: '$TRANSCEND_PASSWORD',
    scopes: [
      TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
      TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
    ],
    apiKeyTitle: 'CLI Usage Cross Instance Sync',
    file: './transcend-api-keys.json',
  },
)}
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: '$TRANSCEND_API_KEY',
})}
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: './transcend-api-keys.json',
})}
\`\`\`

**Push multiple .yml file configurations into multiple Transcend instances**

This uses the output of [\`transcend admin generate-api-keys\`](#transcend-admin-generate-api-keys).

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(
  ['admin', 'generate-api-keys'],
  {
    email: 'test@transcend.io',
    password: '$TRANSCEND_PASSWORD',
    scopes: [
      TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
      TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
    ],
    apiKeyTitle: 'CLI Usage Cross Instance Sync',
    file: './transcend-api-keys.json',
  },
)}
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: './transcend-api-keys.json',
  file: './transcend/',
})}
# <edit .yml files in folder in between these steps>
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: './transcend-api-keys.json',
  file: './transcend/',
})}
\`\`\`

**Apply service classifier to all data flows**

\`\`\`sh
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: '$TRANSCEND_API_KEY',
  resources: [TranscendPullResource.DataFlows],
})}
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: '$TRANSCEND_API_KEY',
  classifyService: true,
})}
\`\`\`

**Push up attributes, deleting any attributes that are not specified in the transcend.yml file**

\`\`\`sh
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: '$TRANSCEND_API_KEY',
  resources: [TranscendPullResource.Attributes],
})}
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: '$TRANSCEND_API_KEY',
  deleteExtraAttributeValues: true,
})}
\`\`\`

Some things to note about this sync process:

1. Any field that is defined in your .yml file will be synced up to app.transcend.io. If any change was made on the Admin Dashboard, it will be overwritten.
2. If you omit a field from the .yml file, this field will not be synced. This gives you the ability to define as much or as little configuration in your transcend.yml file as you would like, and let the remainder of fields be labeled through the Admin Dashboard
3. If you define new data subjects, identifiers, data silos or datapoints that were not previously defined on the Admin Dashboard, the CLI will create these new resources automatically.
4. Currently, this CLI does not handle deleting or renaming of resources. If you need to delete or rename a data silo, identifier, enricher or API key, you should make the change on the Admin Dashboard.
5. The only resources that this CLI will not auto-generate are:

- a) Data silo owners: If you assign an email address to a data silo, you must first make sure that user is invited into your Transcend instance (https://app.transcend.io/admin/users).
- b) API keys: This CLI will not create new API keys. You will need to first create the new API keys on the Admin Dashboard (https://app.transcend.io/infrastructure/api-keys). You can then list out the titles of the API keys that you generated in your transcend.yml file, after which the CLI is capable of updating that API key to be able to respond to different data silos in your Data Map

#### CI Integration

Once you have a workflow for creating your transcend.yml file, you will want to integrate your \`transcend inventory push\` command on your CI.

Below is an example of how to set this up using a Github action:

\`\`\`yaml
name: Transcend Data Map Syncing
# See https://app.transcend.io/privacy-requests/connected-services

on:
  push:
    branches:
      - 'main'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install Transcend CLI
        run: npm install --global @transcend-io/cli

      # If you have a script that generates your transcend.yml file from
      # an ORM or infrastructure configuration, add that step here
      # Leave this step commented out if you want to manage your transcend.yml manually
      # - name: Generate transcend.yml
      #   run: ./scripts/generate_transcend_yml.py

      - name: Push Transcend config
        run: transcend inventory push --auth=\${{ secrets.TRANSCEND_API_KEY }}
\`\`\`

#### Dynamic Variables

If you are using this CLI to sync your Data Map between multiple Transcend instances, you may find the need to make minor modifications to your configurations between environments. The most notable difference would be the domain where your webhook URLs are hosted on.

The \`transcend inventory push\` command takes in a parameter \`variables\`. This is a CSV of \`key:value\` pairs.

This command could fill out multiple parameters in a YAML file like [./examples/multi-instance.yml](./examples/multi-instance.yml), copied below:

\`\`\`yml
api-keys:
  - title: Webhook Key
enrichers:
  - title: Basic Identity Enrichment
    description: Enrich an email address to the userId and phone number
    # The data silo webhook URL is the same in each environment,
    # except for the base domain in the webhook URL.
    url: https://example.<<parameters.domain>>/transcend-enrichment-webhook
    input-identifier: email
    output-identifiers:
      - userId
      - phone
      - myUniqueIdentifier
  - title: Fraud Check
    description: Ensure the email address is not marked as fraudulent
    url: https://example.<<parameters.domain>>/transcend-fraud-check
    input-identifier: email
    output-identifiers:
      - email
    privacy-actions:
      - ERASURE
data-silos:
  - title: Redshift Data Warehouse
    integrationName: server
    description: The mega-warehouse that contains a copy over all SQL backed databases - <<parameters.stage>>
    url: https://example.<<parameters.domain>>/transcend-webhook
    api-key-title: Webhook Key
\`\`\`
`;
