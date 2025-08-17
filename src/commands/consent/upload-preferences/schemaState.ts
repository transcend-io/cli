/**
 * Module: state/schemaState
 *
 * Thin wrapper over PersistedState(FileFormatState) for schema/config
 * discovered during CSV parsing.
 */
import { PersistedState } from '@transcend-io/persisted-state';
import {
  FileFormatState,
  type ColumnIdentifierMap,
  type ColumnPurposeMap,
} from '../../../lib/preference-management';

export interface PreferenceSchemaInterface {
  /** Name of the column used as timestamp, if any */
  getTimestampColumn(): string | undefined;
  /** CSV column name -> Purpose/Preference mapping */
  getColumnToPurposeName(): ColumnPurposeMap;
  /** CSV column name -> Identifier mapping */
  getColumnToIdentifier(): ColumnIdentifierMap;
  /** The persisted cache */ // FIXME remove this
  state: PersistedState<typeof FileFormatState>;
}

/**
 * Build a schema state adapter holding CSV→purpose/identifier mappings.
 *
 * @param filepath - Path to the schema cache file
 * @returns Schema state port with strongly-named methods
 */
export function makeSchemaState(filepath: string): PreferenceSchemaInterface {
  const s = new PersistedState(filepath, FileFormatState, {
    columnToPurposeName: {},
    lastFetchedAt: new Date().toISOString(),
    columnToIdentifier: {},
  });

  return {
    state: s,
    getTimestampColumn: (): string | undefined => s.getValue('timestampColumn'),
    getColumnToPurposeName: (): ColumnPurposeMap =>
      s.getValue('columnToPurposeName'),
    getColumnToIdentifier: (): ColumnIdentifierMap =>
      s.getValue('columnToIdentifier'),
  };
}
