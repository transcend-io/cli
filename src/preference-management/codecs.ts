import {
  PreferenceQueryResponseItem,
  PreferenceUpdateItem,
} from '@transcend-io/privacy-types';
import * as t from 'io-ts';

export const PurposeRowMapping = t.type({
  /** Name of the purpose to map to */
  purpose: t.string,
  /** Mapping from value in row to value in transcend API */
  valueMapping: t.record(t.string, t.union([t.string, t.boolean])),
});

/** Override type */
export type PurposeRowMapping = t.TypeOf<typeof PurposeRowMapping>;

export const FileMetadataState = t.intersection([
  t.type({
    /** Mapping of column name to it's relevant purpose in Transcend */
    columnToPurposeName: t.record(t.string, PurposeRowMapping),
    /** Last time the file was fetched */
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
