/**
 * Convert io-ts codec for transcendAIProxyPolicy.yml to a JSON Schema
 *
 * The output file should be unchanged across major versions.
 * Updates should be PR'd to https://github.com/SchemaStore/schemastore
 *
 * This can be used to add linting/autocomplete/intellisense to IDEs using `transcendAIProxyPolicy.yml`
 * ... by adding this comment to the top of the `transcendAIProxyPolicy.yml` file.
 *
 * `# yaml-language-server: $schema=https://raw.githubusercontent.com/transcend-io/cli/main/transcend-ai-proxy-policy-yml-schema.json`
 *
 * @see https://github.com/redhat-developer/yaml-language-server#using-inlined-schema
 * @see https://json-schema.org/understanding-json-schema/basics.html
 * @see https://github.com/SchemaStore/schemastore
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { toJsonSchema } from '@transcend-io/type-utils';
import { TranscendProxyAIPolicy } from '../src/codecs';

const schemaDefaults = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://raw.githubusercontent.com/transcend-io/cli/main/transcend-ai-proxy-policy-yml-schema.json',
  title: 'transcendAIProxyPolicy.yml',
  description: 'Define the schema for the the Transcend AI Proxy service.',
};

// Build the JSON schema from io-ts codec
const jsonSchema = {
  ...schemaDefaults,
  ...toJsonSchema(TranscendProxyAIPolicy),
};

const schemaFilePath = join(
  process.cwd(),
  'transcend-ai-proxy-policy-yml-schema.json',
);

writeFileSync(schemaFilePath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
