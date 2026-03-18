import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

/**
 * Transforms the output of the consent preferences query into a CSV-friendly format.
 *
 * @param input - The input object containing consent preferences data.
 * @param exportIdentifiersWithDelimiter - Delimiter to use when combining multiple identifier values.
 * @returns A record representing the transformed CSV output.
 */
export function transformPreferenceRecordToCsv(
  {
    identifiers = [],
    purposes = [],
    metadata = [],
    consentManagement = {},
    system = {
      decryptionStatus: 'DECRYPTED',
    },
    // keep other top-level fields as-is (e.g., partition, timestamp, metadataTimestamp)
    ...topLevel
  }: PreferenceQueryResponseItem,
  exportIdentifiersWithDelimiter: string,
): Record<string, unknown> {
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
      out[name] = Array.from(set).join(exportIdentifiersWithDelimiter);
    }
  }

  // ── metadata: serialize as JSON
  if (Array.isArray(metadata)) {
    out.metadata = JSON.stringify(
      metadata.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
    );
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

          if (typeof choice.booleanValue === 'boolean') {
            val = choice.booleanValue;
          } else if (choice.selectValue) {
            val = choice.selectValue;
          } else if (Array.isArray(choice.selectValues)) {
            const vs = choice.selectValues.filter((v) => v.length > 0);
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
