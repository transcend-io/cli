import { SILO_DISCOVERY_FUNCTIONS, SupportedPlugin } from './constants';

/**
 * Helper to check if a plugin is supported
 *
 * @param plugin - the plugin to test
 * @returns whether or not the plugin is supported
 */
export function isSupportedPlugin(plugin: string): plugin is SupportedPlugin {
  return !!SILO_DISCOVERY_FUNCTIONS[plugin as SupportedPlugin];
}
