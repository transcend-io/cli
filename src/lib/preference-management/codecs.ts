import {
  PreferenceQueryResponseItem,
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
  /**
   * Mapping of primaryKey to the rows in the file that need to be uploaded
   *
   * These uploads are overwriting non-existent preferences and are not in
   * conflict with existing consent preferences.
   *
   * Note: If --skipExistingRecordCheck=true is set, there will not be on check
   * for existing record conflicts in order to speed up the upload.
   * So this will say the updates were safe when in fact we don't know.
   * We just let the default consent resolution logic handle it.
   */
  pendingSafeUpdates: PendingSafePreferenceUpdates,
  /**
   * Mapping of primaryKey to the rows in the file that need to be uploaded
   * these records have conflicts with existing consent preferences.
   * Normally the default consent resolution logic will handle these
   * conflicts, but these are useful situations in which to investigate
   * and ensure consent resolution is working as expected.
   *
   * Note: If --skipExistingRecordCheck=true is set, there will not be on check
   * for existing record conflicts in order to speed up the upload. and this will
   * be under-counted.
   *
   * Set to `--skipExistingRecordCheck=false --dryRun=true` to get the list of conflicts.
   */
  pendingConflictUpdates: PendingWithConflictPreferenceUpdates,
  /**
   * Mapping of primaryKey to the rows in the file that can be skipped because
   * their preferences are already in the store. These records may be skipped
   * as they could be a duplicate row in the CSV file.
   *
   * If  `--skipExistingRecordCheck=false` - then no-ops will be filtered out.
   */
  skippedUpdates: SkippedPreferenceUpdates,
  /**
   * The set of failing updates
   * Mapping from primaryKey to the request payload, time upload happened
   * and error message.
   */
  failingUpdates: FailingPreferenceUpdates,
  /**
   * The set of uploads that were pending at the time that the cache file
   * was last written to. When using `--dryRun=true` this list will be full.
   *
   * When running `--dryRun=false` this set will shrink as updates are processed.
   */
  pendingUpdates: PreferenceUpdateMap,
  /**
   * The updates that were successfully processed
   * Mapping from primaryKey to the request response.
   *
   * This will be empty if `--dryRun=true` is set.
   * If `--dryRun=false` is set, this will contain
   * the updates that were successfully processed.
   */
  successfulUpdates: PreferenceUpdateMap,
});

/** Override type */
export type RequestUploadReceipts = t.TypeOf<typeof RequestUploadReceipts>;
