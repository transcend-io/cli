import type { ColumnMetadataMap } from './codecs';

/**
 * Extract metadata values from a CSV row based on the column-to-metadata mapping.
 *
 * @param options - Options for extracting metadata
 * @returns Array of metadata key-value pairs for the preference store API
 */
export function getPreferenceMetadataFromRow({
  row,
  columnToMetadata,
}: {
  /** The CSV row as a record of column name to value */
  row: Record<string, string>;
  /** Mapping from CSV column name to metadata key */
  columnToMetadata: ColumnMetadataMap;
}): Array<{
  /** */ key: string /** */;
  /** */
  value: string;
}> {
  return Object.entries(columnToMetadata)
    .map(([columnName, { key }]) => {
      const value = row[columnName];
      // Skip if no value in the row or empty string
      if (value === undefined || value === '') {
        return null;
      }
      return { key, value };
    })
    .filter(
      (
        x,
      ): x is {
        /** */ key: string /** */;
        /** */
        value: string;
      } => x !== null,
    );
}
