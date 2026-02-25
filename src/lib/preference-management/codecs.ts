import {
  PreferenceQueryResponseItem,
  PreferenceStoreIdentifier,
  PreferenceUpdateItem,
} from '@transcend-io/privacy-types';
import * as t from 'io-ts';

export const PurposeRowMapping = t.type({
  /**
   * The slug or trackingType of the purpose to map to
   *
   * e.g. `Marketing`
   */
  purpose: t.string,
  /**
   * If the column maps to a preference instead of a purpose
   * this is the slug of the purpose.
   *
   * null value indicates that this column maps to the true/false
   * value of the purpose
   */
  preference: t.union([t.string, t.null]),
  /**
   * The mapping between each row value and purpose/preference value.
   *
   * e.g. for a boolean preference or purpose
   * {
   *  'true': true,
   *  'false': false,
   *   '': true,
   * }
   *
   * or for a single or multi select preference
   * {
   *   '': true,
   *   'value1': 'Value1',
   *   'value2': 'Value2',
   * }
   */
  valueMapping: t.record(
    t.string,
    t.union([t.string, t.boolean, t.null, t.undefined]),
  ),
});

/** Override type */
export type PurposeRowMapping = t.TypeOf<typeof PurposeRowMapping>;

/**
 * Mapping of column name to purpose row mapping.
 * This is used to map each column in the CSV to the relevant purpose and preference definitions in
 * transcend.
 */
export const ColumnPurposeMap = t.record(t.string, PurposeRowMapping);

/** Override type */
export type ColumnPurposeMap = t.TypeOf<typeof ColumnPurposeMap>;

export const IdentifierMetadataForPreference = t.type({
  /** The identifier name */
  name: t.string,
  /** Is unique on preference store */
  isUniqueOnPreferenceStore: t.boolean,
});

/** Override type */
export type IdentifierMetadataForPreference = t.TypeOf<
  typeof IdentifierMetadataForPreference
>;

/**
 * Mapping of identifier name to the column name in the CSV file.
 * This is used to map each identifier name to the column in the CSV file.
 */
export const ColumnIdentifierMap = t.record(
  t.string,
  IdentifierMetadataForPreference,
);

/** Override type */
export type ColumnIdentifierMap = t.TypeOf<typeof ColumnIdentifierMap>;

/**
 * Mapping for a single metadata field.
 * Maps a CSV column to a metadata key in the API.
 */
export const MetadataMapping = t.type({
  /** The metadata key name in the API */
  key: t.string,
});

/** Override type */
export type MetadataMapping = t.TypeOf<typeof MetadataMapping>;

/**
 * Mapping of CSV column names to metadata keys.
 * This is used to map columns in the CSV to metadata fields in the preference store.
 */
export const ColumnMetadataMap = t.record(t.string, MetadataMapping);

/** Override type */
export type ColumnMetadataMap = t.TypeOf<typeof ColumnMetadataMap>;

export const FileFormatState = t.intersection([
  t.type({
    /**
     * Definition of how to map each column in the CSV to
     * the relevant purpose and preference definitions in transcend
     */
    columnToPurposeName: ColumnPurposeMap,
    /** Last time the file was last parsed at */
    lastFetchedAt: t.string,
    /** The column name that maps to the identifier */
    columnToIdentifier: ColumnIdentifierMap,
  }),
  t.partial({
    /** Determine which column name in file maps to the timestamp  */
    timestampColumn: t.string,
    /** Mapping of CSV column names to metadata keys */
    columnToMetadata: ColumnMetadataMap,
    /** CSV columns that should be ignored during upload */
    columnsToIgnore: t.array(t.string),
  }),
]);

/** Override type */
export type FileFormatState = t.TypeOf<typeof FileFormatState>;

/**
 * This is the type of the receipts that are stored in the file
 * that is used to track the state of the upload process.
 * It is used to resume the upload process from where it left off.
 * It is used to persist the state of the upload process across multiple runs.
 */
export const PreferenceUpdateMap = t.record(
  t.string,
  // This can either be true to indicate the record is pending
  // or it can be an object showing the object
  // We only return a fixed number of results to avoid
  // making the JSON file too large
  t.union([t.boolean, PreferenceUpdateItem]),
);

/** Override type */
export type PreferenceUpdateMap = t.TypeOf<typeof PreferenceUpdateMap>;

/**
 * This is the type of the pending updates that are safe to run without
 * conflicts with existing consent preferences.
 *
 * Key is primaryKey of the record in the file.
 * The value is the row in the file that is safe to upload.
 */
export const PendingSafePreferenceUpdates = t.record(
  t.string,
  // This can either be true to indicate the record is safe
  // or it can be an object showing the object
  // We only return a fixed number of results to avoid
  // making the JSON file too large
  t.union([t.boolean, t.record(t.string, t.string)]),
);

/** Override type */
export type PendingSafePreferenceUpdates = t.TypeOf<
  typeof PendingSafePreferenceUpdates
>;

/**
 * These are the updates that failed to be uploaded to the API.
 */
export const FailingPreferenceUpdates = t.record(
  t.string,
  t.type({
    /** Time upload ran at */
    uploadedAt: t.string,
    /** Attempts to upload that resulted in an error */
    error: t.string,
    /** The update body */
    update: PreferenceUpdateItem,
  }),
);

/** Override type */
export type FailingPreferenceUpdates = t.TypeOf<
  typeof FailingPreferenceUpdates
>;

/**
 * This is the type of the pending updates that are in conflict with existing consent preferences.
 *
 * Key is primaryKey of the record in the file.
 * The value is the row in the file that is pending upload.
 */
export const PendingWithConflictPreferenceUpdates = t.record(
  t.string,
  // We always return the conflicts for investigation
  t.type({
    /** Record to be inserted to transcend v1/preferences API */
    record: PreferenceQueryResponseItem,
    /** The row in the file that is pending upload */
    row: t.record(t.string, t.string),
  }),
);

/** Override type */
export type PendingWithConflictPreferenceUpdates = t.TypeOf<
  typeof PendingWithConflictPreferenceUpdates
>;

/**
 * The set of preference updates that are skipped
 * Key is primaryKey and value is the row in the CSV
 * that is skipped.
 *
 * This is usually because the preferences are already in the store
 * or there are duplicate rows in the CSV file that are identical.
 */
export const SkippedPreferenceUpdates = t.record(
  t.string,
  t.record(t.string, t.string),
);

/** Override type */
export type SkippedPreferenceUpdates = t.TypeOf<
  typeof SkippedPreferenceUpdates
>;

export const RequestUploadReceipts = t.type({
  /** Last time the file was last parsed at */
  lastFetchedAt: t.string,
  /** Safe updates (no conflict with existing preferences) keyed by primaryKey */
  pendingSafeUpdates: PendingSafePreferenceUpdates,
  /** Conflict updates (existing preferences differ) keyed by primaryKey */
  pendingConflictUpdates: PendingWithConflictPreferenceUpdates,
  /** Skipped rows (already in store or duplicates) keyed by primaryKey */
  skippedUpdates: SkippedPreferenceUpdates,
  /** Failed uploads keyed by primaryKey */
  failingUpdates: FailingPreferenceUpdates,
  /** Pending uploads at time of last cache write; shrinks as processed */
  pendingUpdates: PreferenceUpdateMap,
  /** Successfully processed uploads keyed by primaryKey */
  successfulUpdates: PreferenceUpdateMap,
});

/** Override type */
export type RequestUploadReceipts = t.TypeOf<typeof RequestUploadReceipts>;

export const DeletePreferenceRecordsInput = t.type({
  /** Array of consent preference records to delete */
  records: t.array(
    t.type({
      /** The anchor identifier to locate the consent record */
      anchorIdentifier: PreferenceStoreIdentifier,
      /** The ISO 8601 timestamp of when the deletion is requested */
      timestamp: t.string,
    }),
  ),
});

/** Override type */
export type DeletePreferenceRecordsInput = t.TypeOf<
  typeof DeletePreferenceRecordsInput
>;

export const DeletePreferenceRecordsResponse = t.intersection([
  t.type({
    /** Array of results for each preference record deletion */
    records: t.array(
      t.intersection([
        t.type({
          /** Whether the deletion was successful */
          success: t.boolean,
        }),
        t.partial({
          /** An error message if the deletion failed */
          errorMessage: t.string,
        }),
      ]),
    ),
    /** The list of failed deletions with their respective errors */
    failures: t.array(
      t.type({
        /** The index of the failed update in the original request */
        index: t.number,
        /** The error message associated with the failure */
        error: t.string,
      }),
    ),
  }),
  t.partial({
    /** Any general errors that occurred during the operation */
    errors: t.array(t.string),
  }),
]);

/** Override type */
export type DeletePreferenceRecordsResponse = t.TypeOf<
  typeof DeletePreferenceRecordsResponse
>;

/** CLI CSV Row for deleting preference records */
export const DeletePreferenceRecordCliCsvRow = t.type({
  /** The name of the identifier type (e.g., email, userId) */
  name: t.string,
  /** The value of the identifier */
  value: t.string,
});

/** Override type */
export type DeletePreferenceRecordCliCsvRow = t.TypeOf<
  typeof DeletePreferenceRecordCliCsvRow
>;
