// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type that represents the extracted properties from an object type T.
 * For each property K from T, creates an array of that property's type.
 * Also includes a 'rest' property containing an array of objects with all non-extracted properties.
 *
 *
 * @template T - The source object type
 * @template K - The keys to extract from T
 *  @example
 * // Given an array of objects:
 * const items = [
 *   { id: 1, name: 'John', age: 25, city: 'NY' },
 *   { id: 2, name: 'Jane', age: 30, city: 'LA' }
 * ];
 *
 * // And extracting 'id' and 'name':
 * type Result = ExtractedArrayProperties<typeof items[0], 'id' | 'name'>;
 *
 * // Result will be typed as:
 * {
 *   id: number[];        // [1, 2]
 *   name: string[];      // ['John', 'Jane']
 *   rest: Array<{        // [{ age: 25, city: 'NY' }, { age: 30, city: 'LA' }]
 *     age: number;
 *     city: string;
 *   }>;
 * }
 */
type ExtractedArrayProperties<T, K extends keyof T> = {
  [P in K]: Array<T[P]>;
} & {
  /** The array of non-extracted properties */
  rest: Array<Omit<T, K>>;
};

/**
 * Extracts specified properties from an array of objects into separate arrays.
 * Also collects all non-extracted properties into a 'rest' array.
 *
 * @template T - The type of objects in the input array
 * @template K - The keys of properties to extract
 * @param items - Array of objects to extract properties from
 * @param properties - Array of property keys to extract
 * @returns An object containing arrays of extracted properties and a rest array
 * @example
 * const items = [
 *   { id: 1, name: 'John', age: 25, city: 'NY' },
 *   { id: 2, name: 'Jane', age: 30, city: 'LA' }
 * ]
 * const result = extractProperties(items, ['id', 'name']);
 * // Returns: { id: [1, 2], name: ['John', 'Jane'], rest: [{age: 25, city: 'NY'}, {age: 30, city: 'LA'}] }
 */
export const extractProperties = <T extends object, K extends keyof T>(
  items: T[],
  properties: K[],
): ExtractedArrayProperties<T, K> =>
  items.reduce((acc, item) => {
    const result = { ...acc } as ExtractedArrayProperties<T, K>;

    properties.forEach((prop) => {
      const currentArray = (acc[prop] || []) as T[K][];
      result[prop] = [...currentArray, item[prop]] as any;
    });

    const restObject = {} as Omit<T, K>;
    Object.entries(item).forEach(([key, value]) => {
      if (!properties.includes(key as K)) {
        (restObject as any)[key] = value;
      }
    });

    result.rest = [...(acc.rest || []), restObject];

    return result;
  }, {} as ExtractedArrayProperties<T, K>);
