import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';
import { urlParser } from './parsers';
import {
  DEFAULT_TRANSCEND_API,
  DEFAULT_TRANSCEND_CONSENT_API,
} from '@/constants';

/**
 * Common parameter builders for CLI commands
 * These reduce duplication and ensure consistency across commands
 */

/**
 * Creates a standard authentication parameter
 *
 * @param root0 - The scopes and whether it requires a silo scope
 * @returns The parameter object
 */
export const createAuthParameter = ({
  scopes,
  requiresSiloScope = false,
}: {
  /** The scopes required for the command */
  scopes: ScopeName[] | 'Varies';
  /** Whether the command requires a silo scope */
  requiresSiloScope?: boolean;
}) => {
  const parameter = {
    kind: 'parsed' as const,
    parse: String,
    brief: 'The Transcend API key.',
  };

  if (requiresSiloScope) {
    parameter.brief +=
      ' This key must be associated with the data silo(s) being operated on.';
  }

  if (scopes === 'Varies') {
    return {
      ...parameter,
      brief: `${
        parameter.brief
      } The scopes required will vary depending on the operation performed. If in doubt, the ${
        TRANSCEND_SCOPES[ScopeName.FullAdmin].title
      } scope will always work.`,
    };
  }

  if (scopes.length === 0) {
    return {
      ...parameter,
      brief: `${parameter.brief} No scopes are required for this command.`,
    };
  }

  return {
    ...parameter,
    brief: `${parameter.brief} Requires scopes: ${scopes
      .map((s) => `"${TRANSCEND_SCOPES[s].title}"`)
      .join(', ')}`,
  };
};

/**
 * Creates a standard Transcend URL parameter
 *
 * @param defaultUrl - The default URL to use if not provided
 * @returns The parameter object
 */
export const createTranscendUrlParameter = (
  defaultUrl = DEFAULT_TRANSCEND_API,
) => ({
  kind: 'parsed' as const,
  parse: urlParser,
  brief:
    'URL of the Transcend backend. Use https://api.us.transcend.io for US hosting',
  default: defaultUrl,
});

/**
 * Creates a standard Consent URL parameter
 *
 * @param defaultUrl - The default URL to use if not provided
 * @returns The parameter object
 */
export const createConsentUrlParameter = (
  defaultUrl = DEFAULT_TRANSCEND_CONSENT_API,
) => ({
  kind: 'parsed' as const,
  parse: urlParser,
  brief:
    'URL of the Transcend consent backend. Use https://consent.us.transcend.io for US hosting',
  default: defaultUrl,
});

/**
 * Creates a standard Sombra authentication parameter
 *
 * @returns The parameter object
 */
export const createSombraAuthParameter = () => ({
  kind: 'parsed' as const,
  parse: String,
  brief:
    'The Sombra internal key, use for additional authentication when self-hosting Sombra',
  optional: true as const,
});
