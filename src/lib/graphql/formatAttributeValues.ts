import type { DataSiloAttributeValue } from './syncDataSilos';

export interface FormattedAttribute {
  /** Attribute key */
  key: string;
  /** Attribute values */
  values: string[];
}

/**
 * Format attribute value objects to key-pair values
 *
 * @param vals - Attribute values
 * @returns formatted attributes
 */
export function formatAttributeValues(
  vals: DataSiloAttributeValue[],
): FormattedAttribute[] {
  const attributes: FormattedAttribute[] = [];

  vals.map((val) => {
    let foundKey = attributes.find((att) => att.key === val.attributeKey.name);

    if (foundKey === undefined) {
      foundKey = {
        key: val.attributeKey.name,
        values: [val.name],
      };
      attributes.push(foundKey);
    } else {
      foundKey.values.push(val.name);
    }
    return attributes;
  });

  return attributes;
}
