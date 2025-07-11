import inquirer from 'inquirer';
import autoCompletePrompt from 'inquirer-autocomplete-prompt';
import { apply, ObjByString } from '@transcend-io/type-utils';
import { fuzzySearch } from './fuzzyMatchColumns';

/**
 * Map a set of inputs to a set of outputs
 *
 * @param csvInputs - Input list
 * @param expectedOutputs - Output list
 * @param cache - Cache
 * @returns Mapping from row to enum value
 */
export async function mapEnumValues<TValue extends string>(
  csvInputs: string[],
  expectedOutputs: TValue[],
  cache: { [k in string]: TValue },
): Promise<{ [k in string]: TValue }> {
  inquirer.registerPrompt('autocomplete', autoCompletePrompt);

  const inputs = csvInputs
    .map((item) => item || '<blank>')
    .filter((value) => !cache[value]);
  if (inputs.length === 0) {
    return cache;
  }
  const result = await inquirer.prompt<{ [k in string]: TValue }>(
    inputs.map((value) => ({
      name: value,
      message: `Map value of: ${value}`,
      type: 'autocomplete',
      default: expectedOutputs.find((x) => fuzzySearch(value, x)),
      source: (answersSoFar: ObjByString, input: string) =>
        !input
          ? expectedOutputs
          : expectedOutputs.filter(
              (x) => typeof x === 'string' && fuzzySearch(input, x),
            ),
    })),
  );
  return {
    ...cache,
    ...apply(result, (r) =>
      typeof r === 'string' ? (r as TValue) : (Object.values(r)[0] as TValue),
    ),
  };
}
