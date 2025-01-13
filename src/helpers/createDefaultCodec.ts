// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as t from 'io-ts';

/**
 * // TODO: import from type-utils
 *  Creates a default value for an io-ts codec.
 *
 * @param codec - the codec whose default we want to create
 * @returns an object honoring the io-ts codec
 */
export const createDefaultCodec = <C extends t.Mixed>(
  codec: C,
): t.TypeOf<C> => {
  if (codec instanceof t.UnionType) {
    // First, look for object types in the union
    const arrayType = codec.types.find(
      (type: any) => type instanceof t.ArrayType,
    );
    if (arrayType) {
      return createDefaultCodec(arrayType);
    }

    // First, look for object types in the union
    const objectType = codec.types.find(
      (type: any) =>
        type instanceof t.InterfaceType ||
        type instanceof t.PartialType ||
        type instanceof t.IntersectionType ||
        type instanceof t.ArrayType,
    );
    if (objectType) {
      return createDefaultCodec(objectType);
    }

    // For unions, null has higher preference as default. Otherwise,first type's default
    // If null is one of the union types, it should be the default
    const hasNull = codec.types.some(
      (type: any) => type instanceof t.NullType || type.name === 'null',
    );
    if (hasNull) {
      return null as t.TypeOf<C>;
    }

    // If no null type found, default to first type
    return createDefaultCodec(codec.types[0]);
  }

  if (codec instanceof t.InterfaceType || codec instanceof t.PartialType) {
    const defaults: Record<string, any> = {};
    Object.entries(codec.props).forEach(([key, type]) => {
      defaults[key] = createDefaultCodec(type as any);
    });
    return defaults as t.TypeOf<C>;
  }

  if (codec instanceof t.IntersectionType) {
    // Merge defaults of all types in the intersection
    return codec.types.reduce(
      (acc: t.TypeOf<C>, type: any) => ({
        ...acc,
        ...createDefaultCodec(type),
      }),
      {},
    );
  }

  if (codec instanceof t.ArrayType) {
    // Check if the array element type is an object type
    const elementType = codec.type;
    const isObjectType =
      elementType instanceof t.InterfaceType ||
      elementType instanceof t.PartialType ||
      elementType instanceof t.IntersectionType;

    return (
      isObjectType ? [createDefaultCodec(elementType)] : []
    ) as t.TypeOf<C>;
  }

  // Handle primitive and common types
  switch (codec.name) {
    case 'string':
      return '' as t.TypeOf<C>;
    case 'number':
      return null as t.TypeOf<C>;
    case 'boolean':
      return null as t.TypeOf<C>;
    case 'null':
      return null as t.TypeOf<C>;
    case 'undefined':
      return undefined as t.TypeOf<C>;
    default:
      return null as t.TypeOf<C>;
  }
};
