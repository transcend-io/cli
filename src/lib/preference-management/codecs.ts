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
  valueMapping: t.record(t.string, t.union([t.string, t.boolean, t.null])),
});

/** Override type */
export type PurposeRowMapping = t.TypeOf<typeof PurposeRowMapping>;

export const FileFormatState = t.intersection([
  t.type({
    /**
     * Definition of how to map each column in the CSV to
     * the relevant purpose and preference definitions in transcend
     */
    columnToPurposeName: t.record(t.string, PurposeRowMapping),
    /** Last time the file was last parsed at */
    lastFetchedAt: t.string,
    /** The column name that maps to the identifier */
    columnToIdentifier: t.record(
      t.string,
      t.type({
        /** The identifier name */
        name: t.string,
        /** Is unique on preference store */
        isUniqueOnPreferenceStore: t.boolean,
      }),
    ),
  }),
  t.partial({
    /** Determine which column name in file maps to the timestamp  */
    timestampColumn: t.string,
  }),
]);

/** Override type */
export type FileFormatState = t.TypeOf<typeof FileFormatState>;

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
  pendingSafeUpdates: t.record(
    t.string,
    // This can either be true to indicate the record is safe
    // or it can be an object showing the object
    // We only return a fixed number of results to avoid
    // making the JSON file too large
    t.union([t.boolean, t.record(t.string, t.string)]),
  ),
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
  pendingConflictUpdates: t.record(
    t.string,
    // We always return the conflicts for investigation
    t.type({
      record: PreferenceQueryResponseItem,
      row: t.record(t.string, t.string),
    }),
  ),
  /**
   * Mapping of primaryKey to the rows in the file that can be skipped because
   * their preferences are already in the store. These records may be skipped
   * as they could be a duplicate row in the CSV file.
   *
   * If  `--skipExistingRecordCheck=false` - then no-ops will be filtered out.
   */
  skippedUpdates: t.record(t.string, t.record(t.string, t.string)),
  /**
   * The set of failing updates
   * Mapping from primaryKey to the request payload, time upload happened
   * and error message.
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
   * The set of uploads that were pending at the time that the cache file
   * was last written to. When using `--dryRun=true` this list will be full.
   *
   * When running `--dryRun=false` this set will shrink as updates are processed.
   */
  pendingUpdates: t.record(
    t.string,
    // This can either be true to indicate the record is pending
    // or it can be an object showing the object
    // We only return a fixed number of results to avoid
    // making the JSON file too large
    t.union([t.boolean, PreferenceUpdateItem]),
  ),
  /**
   * The updates that were successfully processed
   * Mapping from primaryKey to the request response.
   *
   * This will be empty if `--dryRun=true` is set.
   * If `--dryRun=false` is set, this will contain
   * the updates that were successfully processed.
   */
  successfulUpdates: t.record(
    t.string,
    // This can either be true to indicate the record is successful
    // or it can be an object showing the object
    // We only return a fixed number of results to avoid
    // making the JSON file too large
    t.union([t.boolean, PreferenceUpdateItem]),
  ),
});

/** Override type */
export type RequestUploadReceipts = t.TypeOf<typeof RequestUploadReceipts>;
