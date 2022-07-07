import { SiloDiscoveryConfig } from './types';
import { javascriptPackageJson, cocoapods } from './integrations';

export const SILO_DISCOVERY_FUNCTIONS: {
  [k in string]: SiloDiscoveryConfig;
} = {
  javascriptPackageJson,
  cocoapods,
};

/**
 * The supported plugin types
 */
export type SupportedPlugin = keyof typeof SILO_DISCOVERY_FUNCTIONS;
