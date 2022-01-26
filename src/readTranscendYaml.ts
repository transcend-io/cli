import { decodeCodec, ObjByString } from '@transcend-io/type-utils';
import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { TranscendInput } from './codecs';

const PARAMETERS = /<<parameters\.(.+?)>>/;

/**
 * Read in the contents of a yaml file and validate that the shape
 * of the yaml file matches the codec API
 *
 * @param filePath - Path to yaml file
 * @param variables - Variables to fill in
 * @returns The contents of the yaml file, type-checked
 */
export function readTranscendYaml(
  filePath: string,
  variables: ObjByString = {},
): TranscendInput {
  // Read in contents
  let fileContents = readFileSync(filePath, 'utf-8');

  // Replace variables
  Object.entries(variables).forEach(([name, value]) => {
    fileContents = fileContents.split(`<<parameters.${name}>>`).join(value);
  });

  // Throw error if unfilled variables
  if (PARAMETERS.test(fileContents)) {
    const [, name] = PARAMETERS.exec(fileContents) || [];
    throw new Error(
      `Found variable that was not set: ${name}.
Make sure you are passing all parameters through the --parameters=${name}:value-for-param flag.
Also check that there are no extra variables defined in your yaml: ${filePath}`,
    );
  }

  return decodeCodec(TranscendInput, yaml.load(fileContents));
}

/**
 * Write a Transcend configuration to disk
 *
 * @param filePath - Path to yaml file
 * @param input - The input to write out
 */
export function writeTranscendYaml(
  filePath: string,
  input: TranscendInput,
): void {
  writeFileSync(filePath, yaml.dump(decodeCodec(TranscendInput, input)));
}
