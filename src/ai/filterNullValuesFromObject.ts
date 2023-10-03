import { ObjByString } from '@transcend-io/type-utils';

/**
 * Given an object, remove all keys that are null-ish
 *
 * @param obj - Object
 * @returns Object with null values removed
 */
export function filterNullValuesFromObject<T extends ObjByString>(obj: T): T {
  return Object.entries(obj).reduce(
    (acc, [k, v]) =>
      v !== null &&
      v !== undefined &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0) &&
      !(typeof v === 'object' && Object.keys(v).length === 0)
        ? Object.assign(acc, { [k]: v })
        : acc,
    {} as T,
  );
}
