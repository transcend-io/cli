import type { DataSiloAttributeValue } from "./syncDataSilos";

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
  vals: DataSiloAttributeValue[]
): FormattedAttribute[] {
  const attributes: FormattedAttribute[] = [];

  vals.map((value) => {
    let foundKey = attributes.find(
      (att) => att.key === value.attributeKey.name
    );

    if (foundKey === undefined) {
      foundKey = {
        key: value.attributeKey.name,
        values: [value.name],
      };
      attributes.push(foundKey);
    } else {
      foundKey.values.push(value.name);
    }
    return attributes;
  });

  return attributes;
}
