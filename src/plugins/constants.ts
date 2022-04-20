import { scanPackageJson } from './scanPackageJson';

export const SILO_DISCOVERY_FUNCTIONS = {
  javascriptPackageJson: scanPackageJson,
};

/**
 * The supported plugin types
 */
export type SupportedPlugin = keyof typeof SILO_DISCOVERY_FUNCTIONS;
