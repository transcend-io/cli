import upperFirst from 'lodash/upperFirst';
import { apply, invert } from '@transcend-io/type-utils';
import { AttributeSupportedResourceType } from '@transcend-io/privacy-types';

/**
 * TODO: https://transcend.height.app/T-23527 - re-design GraphQL schema to remove the need for this
 */
export const ATTRIBUTE_KEY_SINGULAR_TO_PLURAL: Record<
  AttributeSupportedResourceType,
  string
> = {
  [AttributeSupportedResourceType.ActionItem]: 'actionItems',
  [AttributeSupportedResourceType.BusinessEntity]: 'businessEntities',
  [AttributeSupportedResourceType.DataSilo]: 'dataSilos',
  [AttributeSupportedResourceType.DataSubCategory]: 'dataSubCategories',
  [AttributeSupportedResourceType.ProcessingPurposeSubCategory]:
    'processingPurposeSubCategories',
  [AttributeSupportedResourceType.Request]: 'requests',
  [AttributeSupportedResourceType.SubDataPoint]: 'subDataPoints',
  [AttributeSupportedResourceType.AirgapCookie]: 'airgapCookies',
  [AttributeSupportedResourceType.AirgapDataFlow]: 'airgapDataFlows',
  [AttributeSupportedResourceType.Vendor]: 'vendors',
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
