/**
 * Convert io-ts codec for transcend.yml to a JSON Schema
 *
 * This can be used to add linting/autocomplete/intellisense to IDEs using `transcend.yml`
 * ... by adding this comment to the top of the `transcend.yml` file.
 *
 * `# yaml-language-server: $schema=/absolute/path/to/schema`
 *
 * @see https://github.com/redhat-developer/yaml-language-server#using-inlined-schema
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { toJsonSchema } from './helpers/toJsonSchema';

import { TranscendInput } from '../src/codecs.ts';

const jsonSchema = toJsonSchema(TranscendInput);
const schemaFilePath = join(process.cwd(), 'transcend-yml-schema.json');
writeFileSync(schemaFilePath, JSON.stringify(jsonSchema, null, 2));
