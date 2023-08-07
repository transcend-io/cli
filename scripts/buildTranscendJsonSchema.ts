/**
 * Convert io-ts codec for transcend.yml to a JSON Schema
 *
 * Updates should be PR'd to https://github.com/SchemaStore/schemastore
 *
 * This can be used to add linting/autocomplete/intellisense to IDEs using `transcend.yml`
 * ... by adding this comment to the top of the `transcend.yml` file.
 *
 * `# yaml-language-server: $schema=https://raw.githubusercontent.com/transcend-io/cli/main/transcend-yml-schema-v4.json`
 *
 * @see https://github.com/redhat-developer/yaml-language-server#using-inlined-schema
 * @see https://json-schema.org/understanding-json-schema/basics.html
 * @see https://github.com/SchemaStore/schemastore
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { toJsonSchema } from '@transcend-io/type-utils';
import * as packageJson from '../package.json';
import { TranscendInput } from '../src/codecs';

const schemaDefaults = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://raw.githubusercontent.com/transcend-io/cli/main/transcend-yml-schema-v4.json',
  title: 'transcend.yml',
  description: 'Define personal data schema in code using Transcend.',
};

// Build the JSON schema from io-ts codec
const jsonSchema = { ...schemaDefaults, ...toJsonSchema(TranscendInput) };

const majorVersion = packageJson.version.split('.')[0];
const schemaFilePath = join(
  process.cwd(),
  `transcend-yml-schema-v${majorVersion}.json`,
);

writeFileSync(schemaFilePath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
