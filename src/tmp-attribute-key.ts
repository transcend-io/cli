import upperFirst from 'lodash/upperFirst';
import { apply, invert, makeEnum } from '@transcend-io/type-utils';
import { AttributeSupportedResourceType } from '@transcend-io/privacy-types';

/**
 * Resources that can be assigned attributes
 * TODO: https://transcend.height.app/T-23523 - remove this enum after ROPA view is deprecated
 */
export const AttributeResourceType = makeEnum({
  ...AttributeSupportedResourceType,
  /** Ropa */
  ROPA: 'ROPA',
});

/** Type override */
export type AttributeResourceType =
  typeof AttributeResourceType[keyof typeof AttributeResourceType];

/**
 * TODO: https://transcend.height.app/T-23527 - re-design GraphQL schema to remove the need for this
 */
export const ATTRIBUTE_KEY_SINGULAR_TO_PLURAL: Record<
  AttributeResourceType,
  string
> = {
  [AttributeResourceType.BusinessEntity]: 'businessEntities',
  [AttributeResourceType.DataSilo]: 'dataSilos',
  [AttributeResourceType.DataSubCategory]: 'dataSubCategories',
  [AttributeResourceType.ProcessingPurposeSubCategory]:
    'processingPurposeSubCategories',
  [AttributeResourceType.Request]: 'requests',
  [AttributeResourceType.ROPA]: 'ROPA',
  [AttributeResourceType.SubDataPoint]: 'subDataPoints',
  [AttributeResourceType.AirgapCookie]: 'airgapCookies',
  [AttributeResourceType.AirgapDataFlow]: 'airgapDataFlows',
  [AttributeResourceType.Vendor]: 'vendors',
};

/**
 * TODO: https://transcend.height.app/T-23527 - re-design GraphQL schema to remove the need for this
 */
export const ATTRIBUTE_KEY_PLURAL_TO_SINGULAR = invert(
  ATTRIBUTE_KEY_SINGULAR_TO_PLURAL,
);

/**
 * TODO: https://transcend.height.app/T-23527 - re-design GraphQL schema to remove the need for this
 */
export const ATTRIBUTE_KEY_TO_ENABLED_ON = apply(
  ATTRIBUTE_KEY_SINGULAR_TO_PLURAL,
  (pluralName) => `enabledOn${upperFirst(pluralName)}`,
);

/**
 * TODO: https://transcend.height.app/T-23527 - re-design GraphQL schema to remove the need for this
 */
export const ENABLED_ON_TO_ATTRIBUTE_KEY = invert(ATTRIBUTE_KEY_TO_ENABLED_ON);
