/**
 * Convert io-ts codec for transcend.yml to a JSON Schema
 *
 * The resulting JSON schema is published in https://github.com/SchemaStore/schemastore
 * Most IDEs will thus autodetect `transcend.yml` and apply linting/autocomplete/intellisense.
 *
 * ... or, if the YAML file is differently named, users can add this comment to the top of the YAML file:
 * `# yaml-language-server: $schema=https://raw.githubusercontent.com/transcend-io/cli/main/transcend-policy-yml-schema.json`
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
  $id: 'https://raw.githubusercontent.com/transcend-io/cli/main/transcend-yml-schema-v5.json',
  title: 'transcend.yml',
  description:
    'Define personal data schema and Transcend config as code with the Transcend CLI.',
};

// Build the JSON schema from io-ts codec
const jsonSchema = { ...schemaDefaults, ...toJsonSchema(TranscendInput) };

const majorVersion = packageJson.version.split('.')[0];
const schemaFilePath = join(
  process.cwd(),
  `transcend-yml-schema-v${majorVersion}.json`,
);

writeFileSync(schemaFilePath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
