import { valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';
import { EnabledRouteC } from '../../codecs';
import { PathfinderPolicyName } from '../../enums';

/**
 * Builds a custom io-ts type that represents a route allowed by the proxy
 *
 * @param TRouteName - the string with the name of the allowed route
 * @returns custom io-ts AllowedRoute type
 */
export const buildEnabledRouteType = <T extends t.Mixed>({
  TRouteName,
}: {
  /** the type of the routeName property */
  TRouteName: T;
}): EnabledRouteC<T> =>
  t.type({
    routeName: TRouteName,
    enabledPolicies: t.array(valuesOf(PathfinderPolicyName)),
  });
