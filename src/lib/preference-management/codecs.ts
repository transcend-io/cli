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

export const FileMetadataState = t.intersection([
  t.type({
    /**
     * Definition of how to map each column in the CSV to
     * the relevant purpose and preference definitions in transcend
     */
    columnToPurposeName: t.record(t.string, PurposeRowMapping),
    /** Last time the file was last parsed at */
    lastFetchedAt: t.string,
    /**
     * Mapping of userId to the rows in the file that need to be uploaded
     * These uploads are overwriting non-existent preferences and are safe
     */
    pendingSafeUpdates: t.record(t.string, t.record(t.string, t.string)),
    /**
     * Mapping of userId to the rows in the file that need to be uploaded
     * these records have conflicts with existing consent preferences
     */
    pendingConflictUpdates: t.record(
      t.string,
      t.type({
        record: PreferenceQueryResponseItem,
        row: t.record(t.string, t.string),
      }),
    ),
    /**
     * Mapping of userId to the rows in the file that can be skipped because
     * their preferences are already in the store
     */
    skippedUpdates: t.record(t.string, t.record(t.string, t.string)),
  }),
  t.partial({
    /** Determine which column name in file maps to consent record identifier to upload on  */
    identifierColumn: t.string,
    /** Determine which column name in file maps to the timestamp  */
    timestampColum: t.string,
  }),
]);

/** Override type */
export type FileMetadataState = t.TypeOf<typeof FileMetadataState>;

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

/** Persist this data between runs of the script */
export const PreferenceState = t.type({
  /**
   * Store a cache of previous files read in
   */
  fileMetadata: t.record(t.string, FileMetadataState),
  /**
   * The set of successful uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  failingUpdates: t.record(
    t.string,
    t.type({
      /** Time upload ran at */
      uploadedAt: t.string,
      /** Attempts to upload that resulted in an error */
      error: t.string,
      /** The update body */
      update: PreferenceUpdateItem,
    }),
  ),
  /**
   * The set of pending uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  pendingUpdates: t.record(t.string, PreferenceUpdateItem),
});

/** Override type */
export type PreferenceState = t.TypeOf<typeof PreferenceState>;
