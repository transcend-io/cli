import colors from 'colors';
import * as t from 'io-ts';
import { logger } from '../../logger';

export const ParsedAttributeInput = t.type({
  /** Attribute key */
  key: t.string,
  /** Attribute values */
  values: t.array(t.string),
});

/** Type override */
export type ParsedAttributeInput = t.TypeOf<typeof ParsedAttributeInput>;

/**
 * Parse out the extra attributes to apply to all requests uploaded
 *
 * @param attributes - input as string, e.g. ['key:value1;value2','key2:value3;value4']
 * @returns The parsed attributes
 */
export function parseAttributesFromString(
  attributes: string[],
): ParsedAttributeInput[] {
  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = attributes.map((attribute) => {
    const [attributeKey, attributeValuesRaw] = attribute.trim().split(':');
    if (!attributeValuesRaw) {
      throw new Error(
        'Expected attributes in key:value1;value2,key2:value3;value4',
      );
    }
    const attributeValues = attributeValuesRaw.split(';');
    return {
      key: attributeKey,
      values: attributeValues,
    };
  });
  logger.info(colors.magenta('Attributes to apply to all requests:'));
  logger.info(colors.magenta(JSON.stringify(parsedAttributes, null, 2)));
  return parsedAttributes;
}
