import colors from 'colors';
import { logger } from '../logger';

export interface AttributeInput {
  /** Attribute key */
  key: string;
  /** Attribute values */
  values: string[];
}

/**
 * Parse out the extra attributes to apply to all requests uploaded
 *
 * @param attributes - input as string, e.g. ['key:value1;value2','key2:value3;value4']
 * @returns The parsed attributes
 */
export function parseAttributesFromString(
  attributes: string[],
): AttributeInput[] {
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
  logger.info(colors.magenta('Attributes:'));
  logger.info(colors.magenta(JSON.stringify(parsedAttributes, null, 2)));
  return parsedAttributes;
}
