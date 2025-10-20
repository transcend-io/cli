import type { LocalContext } from '../../../context';
import colors from 'colors';

import {
  fetchConsentPreferences,
  type PreferenceIdentifier,
} from '../../../lib/consent-manager';
import { writeCsv } from '../../../lib/cron';
import { createSombraGotInstance } from '../../../lib/graphql';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { logger } from '../../../logger';

export interface PullConsentPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  file: string;
  transcendUrl: string;
  timestampBefore?: Date;
  timestampAfter?: Date;
  updatedBefore?: Date;
  updatedAfter?: Date;
  identifiers?: string[];
  concurrency: number;
}

/**
 * Transforms the output of the consent preferences query into a CSV-friendly format.
 *
 * @param input - The input object containing consent preferences data.
 * @returns A record representing the transformed CSV output.
 */
function transformToCsvOutput({
  identifiers = [],
  purposes = [],
  metadata = [],
  consentManagement = {},
  system = {
    decryptionStatus: 'DECRYPTED',
  },
  // keep other top-level fields as-is (e.g., partition, timestamp, metadataTimestamp)
  ...topLevel
}: PreferenceQueryResponseItem): Record<string, unknown> {
  // Start with: all other top-level fields + spread system and consentManagement
  const out: Record<string, unknown> = {
    ...topLevel,
    ...system,
    ...consentManagement,
  };

  // ── identifiers: each identifier.name -> CSV of values
  if (Array.isArray(identifiers)) {
    const byName = new Map<string, Set<string>>();
    for (const { name, value } of identifiers) {
      if (!byName.has(name)) byName.set(name, new Set());
      if (value) byName.get(name)!.add(value);
    }
    for (const [name, set] of byName.entries()) {
      out[name] = Array.from(set).join(',');
    }
  }

  // ── metadata: group by key; each unique key -> CSV of values
  if (Array.isArray(metadata)) {
    const byKey = new Map<string, Set<string>>();
    for (const { key, value } of metadata) {
      if (!byKey.has(key)) byKey.set(key, new Set());
      if (value) byKey.get(key)!.add(value);
    }
    for (const [key, set] of byKey.entries()) {
      out[`metadata_${key}`] = Array.from(set).join(',');
    }
  }

  // ── purposes:
  //   - purpose.slug column => true/false (enabled)
  //   - for each preference: purpose.slug_preference.slug => bool | single | CSV (multi)
  if (Array.isArray(purposes)) {
    for (const { purpose, preferences, enabled } of purposes) {
      out[purpose] = Boolean(enabled);

      // nested preferences
      if (Array.isArray(preferences)) {
        for (const { topic, choice } of preferences) {
          const col = `${purpose}_${topic}`;

          let val: unknown = null;

          if (Object.prototype.hasOwnProperty.call(choice, 'booleanValue')) {
            val = Boolean(choice.booleanValue);
          } else if (
            Object.prototype.hasOwnProperty.call(choice, 'selectValue')
          ) {
            val = String(choice.selectValue ?? '');
          } else if (Array.isArray(choice.selectValues)) {
            const vs = choice.selectValues
              .map((v: unknown) => String(v))
              .filter((v: string) => v.length > 0);
            val = vs.join(',');
          } else {
            // no pref value present -> null
            val = null;
          }

          out[col] = val;
        }
      }
    }
  }

  return out;
}

export async function pullConsentPreferences(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    file,
    transcendUrl,
    timestampBefore,
    timestampAfter,
    updatedBefore,
    updatedAfter,
    identifiers = [],
    concurrency,
  }: PullConsentPreferencesCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Identifiers are key:value, parse to PreferenceIdentifier[]
  const parsedIdentifiers = identifiers.map(
    (identifier): PreferenceIdentifier => {
      if (!identifier.includes(':')) {
        return {
          name: 'email',
          value: identifier,
        };
      }
      const [name, value] = identifier.split(':');
      return { name, value };
    },
  );

  // Fetch preferences
  const preferences = await fetchConsentPreferences(sombra, {
    partition,
    filterBy: {
      ...(timestampBefore
        ? { timestampBefore: timestampBefore.toISOString() }
        : {}),
      ...(timestampAfter
        ? { timestampAfter: timestampAfter.toISOString() }
        : {}),
      ...(updatedAfter || updatedBefore
        ? {
            system: {
              ...(updatedBefore
                ? { updatedBefore: updatedBefore.toISOString() }
                : {}),
              ...(updatedAfter
                ? { updatedAfter: updatedAfter.toISOString() }
                : {}),
            },
          }
        : {}),
      ...(parsedIdentifiers.length > 0
        ? { identifiers: parsedIdentifiers }
        : {}),
    },
    limit: concurrency,
  });

  logger.info(
    colors.green(
      `Fetched ${preferences.length} consent preference records from partition ${partition}. `,
    ),
  );

  logger.info(colors.magenta(`Writing preferences to CSV file at: ${file}`));

  // Write to disk
  writeCsv(file, preferences.map(transformToCsvOutput));

  logger.info(colors.green(`Successfully wrote preferences to ${file}`));
}
