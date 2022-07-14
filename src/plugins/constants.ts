import { SiloDiscoveryConfig } from './types';
import {
  cocoapods,
  gradle,
  javascriptPackageJson,
  pythonRequirementsTxt,
} from './integrations';

export const SILO_DISCOVERY_FUNCTIONS: {
  [k in string]: SiloDiscoveryConfig;
} = {
  cocoapods,
  gradle,
  javascriptPackageJson,
  pythonRequirementsTxt,
};

/**
 * The supported plugin types
 */
export type SupportedPlugin = keyof typeof SILO_DISCOVERY_FUNCTIONS;
