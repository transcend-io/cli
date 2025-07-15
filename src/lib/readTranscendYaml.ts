import { decodeCodec, ObjByString } from '@transcend-io/type-utils';
import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { TranscendInput } from '../codecs';

export const VARIABLE_PARAMETERS_REGEXP = /<<parameters\.(.+?)>>/;
export const VARIABLE_PARAMETERS_NAME = 'parameters';

/**
 * Function that replaces variables in a text file.
 * Throws error if there are variables that have not been replaced
 *
 * @param input - Input text
 * @param variables - Variables to replace
 * @param extraErrorMessage - Additional error message text
 * @returns Output text
 */
export function replaceVariablesInYaml(
  input: string,
  variables: ObjByString,
  extraErrorMessage = '',
): string {
  let contents = input;
  // Replace variables
  Object.entries(variables).forEach(([name, value]) => {
    contents = contents
      .split(`<<${VARIABLE_PARAMETERS_NAME}.${name}>>`)
      .join(value);
  });

  // Throw error if unfilled variables
  if (VARIABLE_PARAMETERS_REGEXP.test(contents)) {
    const [, name] = VARIABLE_PARAMETERS_REGEXP.exec(contents) || [];
    throw new Error(
      `Found variable that was not set: ${name}.
Make sure you are passing all parameters through the --${VARIABLE_PARAMETERS_NAME}=${name}:value-for-param flag.
${extraErrorMessage}`,
    );
  }

  return contents;
}

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
  const fileContents = readFileSync(filePath, 'utf-8');

  // Replace variables
  const replacedVariables = replaceVariablesInYaml(
    fileContents,
    variables,
    `Also check that there are no extra variables defined in your yaml: ${filePath}`,
  );

  // Validate shape
  return decodeCodec(TranscendInput, yaml.load(replacedVariables));
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
