import { scanPackageJson } from './scanPackageJson';
import type { SiloDiscoveryFunction } from './types';

export const SILO_DISCOVERY_FUNCTIONS: {
  [k in string]: SiloDiscoveryFunction;
} = {
  javascriptPackageJson: scanPackageJson,
};

/**
 * The supported plugin types
 */
export type SupportedPlugin = keyof typeof SILO_DISCOVERY_FUNCTIONS;
