import { SiloDiscoveryConfig } from './types';
import {
  javascriptPackageJson,
  cocoaPods,
  pythonRequirementsTxt,
} from './integrations';

export const SILO_DISCOVERY_FUNCTIONS: {
  [k in string]: SiloDiscoveryConfig;
} = {
  javascriptPackageJson,
  cocoaPods,
  pythonRequirementsTxt,
};

/**
 * The supported plugin types
 */
export type SupportedPlugin = keyof typeof SILO_DISCOVERY_FUNCTIONS;
