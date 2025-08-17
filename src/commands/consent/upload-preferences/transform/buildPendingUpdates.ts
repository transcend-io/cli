/**
 * Module: transform/buildPendingUpdates
 *
 * Pure transformation from parsed CSV rows + schema mappings into
 * PreferenceUpdateItem payloads, ready for upload.
 */
import type { PreferenceUpdateItem } from '@transcend-io/privacy-types';
import type { PreferenceTopic, Purpose } from '../../../../lib/graphql';
import {
  getPreferenceIdentifiersFromRow,
  getPreferenceUpdatesFromRow,
  NONE_PREFERENCE_MAP,
  type ColumnIdentifierMap,
  type ColumnPurposeMap,
  type PendingSafePreferenceUpdates,
  type PendingWithConflictPreferenceUpdates,
} from '../../../../lib/preference-management';
import type { FormattedAttribute } from '../../../../lib/graphql/formatAttributeValues';

export interface BuildPendingParams {
  /** Safe updates keyed by user/primaryKey */
  safe: PendingSafePreferenceUpdates;
  /** Conflict updates keyed by user/primaryKey (value.row contains row data) */
  conflicts: PendingWithConflictPreferenceUpdates;
  /** Only upload safe updates (ignore conflicts entirely) */
  skipConflictUpdates: boolean;
  /** Name of the column to use as the preference timestamp (if available) */
  timestampColumn?: string;
  /** CSV column -> purpose/preference mapping */
  columnToPurposeName: ColumnPurposeMap;
  /** CSV column -> identifier mapping */
  columnToIdentifier: ColumnIdentifierMap;
  /** Full set of preference topics for resolving row → preference values */
  preferenceTopics: PreferenceTopic[];
  /** Full set of purposes for resolving slugs/trackingTypes */
  purposes: Purpose[];
  /** Partition to attribute to every record */
  partition: string;
  /** Static attributes injected into workflow settings */
  workflowAttrs: FormattedAttribute[];
  /** If true, downstream should avoid user-visible notifications */
  isSilent: boolean;
  /** If true, skip triggering workflows downstream */
  skipWorkflowTriggers: boolean;
}

/**
 * Convert parsed CSV rows into a map of PreferenceUpdateItem payloads.
 *
 * This function is *pure* (no IO, logging or state writes) and therefore easy to test.
 *
 * @param params - Transformation inputs
 * @returns Map of primaryKey -> PreferenceUpdateItem
 */
export function buildPendingUpdates(
  params: BuildPendingParams,
): Record<string, PreferenceUpdateItem> {
  const {
    safe,
    conflicts,
    skipConflictUpdates,
    timestampColumn,
    columnToPurposeName,
    columnToIdentifier,
    preferenceTopics,
    purposes,
    partition,
    workflowAttrs,
    isSilent,
    skipWorkflowTriggers,
  } = params;

  // If conflicts are to be included, normalize the shape to match `safe` rows.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: Record<string, any> = skipConflictUpdates
    ? { ...safe }
    : {
        ...safe,
        ...Object.fromEntries(
          Object.entries(conflicts).map(([id, v]) => [id, v.row]),
        ),
      };

  const purposeSlugs = purposes.map((x) => x.trackingType);
  const out: Record<string, PreferenceUpdateItem> = {};

  for (const [userId, row] of Object.entries(merged)) {
    // Determine timestamp used for the store
    const ts =
      timestampColumn === NONE_PREFERENCE_MAP || !timestampColumn
        ? new Date()
        : new Date(row[timestampColumn]);

    // Resolve purposes/preferences from columns using schema mappings + topics
    const updates = getPreferenceUpdatesFromRow({
      row,
      columnToPurposeName,
      preferenceTopics,
      purposeSlugs,
    });

    // Resolve identifiers per row (email, phone, userId, etc.)
    const identifiers = getPreferenceIdentifiersFromRow({
      row,
      columnToIdentifier,
    });

    out[userId] = {
      identifiers,
      partition,
      timestamp: ts.toISOString(),
      purposes: Object.entries(updates).map(([purpose, value]) => ({
        ...value,
        purpose,
        workflowSettings: {
          attributes: workflowAttrs,
          isSilent,
          skipWorkflowTrigger: skipWorkflowTriggers,
        },
      })),
    };
  }

  return out;
}
