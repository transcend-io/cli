/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Converts all primitive values in an object or array to empty strings while maintaining structure
 *
 * @param input - A primitive value, object, or array to be processed
 * @returns The input structure with all primitive values converted to empty strings
 * @example
 * // Simple primitive
 * convertToEmptyStrings(42) // returns ''
 *
 * // Array
 * convertToEmptyStrings([1, 'hello', true]) // returns ['', '', '']
 *
 * // Complex object
 * convertToEmptyStrings({
 *   id: 123,
 *   name: 'test',
 *   nested: {
 *     active: true,
 *     count: 0
 *   },
 *   items: [1, 2, 3]
 * })
 * // returns {
 * //   id: '',
 * //   name: '',
 * //   nested: {
 * //     active: '',
 * //     count: ''
 * //   },
 * //   items: ['', '', '']
 * // }
 */
export function convertToEmptyStrings<T>(input: T): any {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return '';
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map((item) => convertToEmptyStrings(item));
  }

  // Handle objects
  if (typeof input === 'object') {
    return Object.entries(input).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: convertToEmptyStrings(value),
      }),
      {} as Record<string, any>,
    );
  }

  // Handle primitives
  return '';
}
