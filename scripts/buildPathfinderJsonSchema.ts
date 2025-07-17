/**
 * Convert io-ts codec for pathfinder.yml to a JSON Schema
 *
 * The resulting JSON schema is published in https://github.com/SchemaStore/schemastore
 * Most IDEs will thus autodetect `pathfinder.yml` and apply linting/autocomplete/intellisense.
 *
 * ... or, if the YAML file is differently named, users can add this comment to the top of the YAML file:
 * `# yaml-language-server: $schema=https://raw.githubusercontent.com/transcend-io/cli/main/pathfinder-policy-yml-schema.json`
 *
 * @see https://github.com/redhat-developer/yaml-language-server#using-inlined-schema
 * @see https://json-schema.org/understanding-json-schema/basics.html
 * @see https://github.com/SchemaStore/schemastore
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { toJsonSchema } from "@transcend-io/type-utils";
import { PathfinderPolicy } from "../src/codecs";

const schemaDefaults = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://raw.githubusercontent.com/transcend-io/cli/main/pathfinder-policy-yml-schema.json",
  title: "pathfinder.yml",
  description: "Policies for the Transcend Pathfinder AI governance proxy.",
};

// Build the JSON schema from io-ts codec
const jsonSchema = {
  ...schemaDefaults,
  ...toJsonSchema(PathfinderPolicy, true),
};

const schemaFilePath = join(process.cwd(), "pathfinder-policy-yml-schema.json");

writeFileSync(schemaFilePath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
