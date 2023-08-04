import * as t from 'io-ts';
import { AIIntegrationC, EnabledRouteC } from '../codecs';

/**
 * Helper to build a custom io-ts type representing an AIIntegration
 *
 * @param TEnabledRoutes - the type of the enabledRoutes for the AIIntegration type
 * @returns an AIIntegration type
 */
export const buildAIIntegrationType = <T extends t.ArrayC<EnabledRouteC>>({
  TEnabledRoutes,
}: {
  /** the type of the enabledRoutes property */
  TEnabledRoutes: T;
}): AIIntegrationC =>
  t.type({
    enabledRoutes: TEnabledRoutes,
  });
