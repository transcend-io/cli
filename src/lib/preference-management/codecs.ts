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
   * Mapping of userId to the rows in the file that need to be uploaded
   * These uploads are overwriting non-existent preferences and are safe
   */
  pendingSafeUpdates: t.record(
    t.string,
    t.union([t.boolean, t.record(t.string, t.string)]),
  ),
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
  pendingUpdates: t.record(
    t.string,
    t.union([t.boolean, PreferenceUpdateItem]),
  ),
  /**
   * The successful updates
   */
  successfulUpdates: t.record(
    t.string,
    t.union([t.boolean, PreferenceUpdateItem]),
  ),
});

/** Override type */
export type RequestUploadReceipts = t.TypeOf<typeof RequestUploadReceipts>;
