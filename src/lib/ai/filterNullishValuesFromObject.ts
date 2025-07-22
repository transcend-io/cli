import { ObjByString } from '@transcend-io/type-utils';

/**
 * Given an object, remove all keys that are null-ish
 *
 * @param obj - Object
 * @returns Object with null-ish values removed
 */
export function filterNullishValuesFromObject<T extends ObjByString>(
  object: T,
): T {
  return Object.entries(object).reduce(
    (accumulator, [k, v]) =>
      v !== null &&
      v !== undefined &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0) &&
      !(typeof v === 'object' && Object.keys(v).length === 0)
        ? Object.assign(accumulator, { [k]: v })
        : accumulator,
    {} as T,
  );
}
