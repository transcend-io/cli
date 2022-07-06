import { SiloDiscoveryConfig } from './types';
import { javascriptPackageJson, cocopods } from './integrations';

export const SILO_DISCOVERY_FUNCTIONS: {
  [k in string]: SiloDiscoveryConfig;
} = {
  javascriptPackageJson,
  cocopods,
};

/**
 * The supported plugin types
 */
export type SupportedPlugin = keyof typeof SILO_DISCOVERY_FUNCTIONS;
