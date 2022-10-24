import { TranscendInput } from './codecs';
import { getEntries } from '@transcend-io/type-utils';

/**
 * Combine a set of TranscendInput yaml files into a single yaml
 *
 * @param base - Base input
 * @param inputs - The list of inputs
 * @returns Merged input
 */
export function mergeTranscendInputs(
  base: TranscendInput,
  ...inputs: TranscendInput[]
): TranscendInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloned: any = JSON.parse(JSON.stringify(base));
  inputs.forEach((input) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getEntries(input).forEach(([key, value]: [any, any]) => {
      if (cloned[key] === undefined) {
        cloned[key] = value;
      } else if (Array.isArray(value)) {
        cloned[key] = [...cloned[key], ...value];
      } else {
        cloned[key] = value;
      }
    });
  });
  return cloned;
}
