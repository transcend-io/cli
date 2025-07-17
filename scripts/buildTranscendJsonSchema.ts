/**
 * Convert io-ts codec for transcend.yml to a JSON Schema
 *
 * The resulting JSON schema is published in https://github.com/SchemaStore/schemastore
 * Most IDEs will thus autodetect `transcend.yml` and apply linting/autocomplete/intellisense.
 *
 * ... or, if the YAML file is differently named, users can add this comment to the top of the YAML file:
 * `# yaml-language-server: $schema=https://raw.githubusercontent.com/transcend-io/cli/main/transcend-yml-schema-latest.json`
 *
 * @see https://github.com/redhat-developer/yaml-language-server#using-inlined-schema
 * @see https://json-schema.org/understanding-json-schema/basics.html
 * @see https://github.com/SchemaStore/schemastore
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { toJsonSchema } from '@transcend-io/type-utils';
import * as packageJson from '../package.json';
import { TranscendInput } from '../src/codecs';

const majorVersion = packageJson.version.split('.')[0];

// Create a major version JSON schema definition, and update the latest JSON schema definition.
for (const key of [`v${majorVersion}`, 'latest']) {
  const fileName = `transcend-yml-schema-${key}.json`;

  const schemaDefaults = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://raw.githubusercontent.com/transcend-io/cli/main/${fileName}`,
    title: 'transcend.yml',
    description:
      'Define personal data schema and Transcend config as code with the Transcend CLI.',
  };

  // Build the JSON schema from io-ts codec
  const jsonSchema = { ...schemaDefaults, ...toJsonSchema(TranscendInput) };

  const schemaFilePath = path.join(process.cwd(), fileName);

  writeFileSync(
    schemaFilePath,
    `${JSON.stringify(jsonSchema, undefined, 2)}\n`,
  );
}
