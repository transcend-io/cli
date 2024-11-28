import {
  PreferenceQueryResponseItem,
  PreferenceStorePurposeUpdate,
} from '@transcend-io/privacy-types';
import * as t from 'io-ts';

export const FileMetadataState = t.intersection([
  t.type({
    /** Mapping of column name to it's relevant purpose in Transcend */
    columnToPurposeName: t.record(t.string, t.string),
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
    pendingConflictUpdates: t.record(t.string, t.record(t.string, t.string)),
    /**
     * Mapping of userId to the rows in the file that can be skipped because
     * their preferences are already in the store
     */
    skippedUpdates: t.record(t.string, t.record(t.string, t.string)),
    /**
     * Mapping of userId to the rows in the file that have been successfully uploaded
     */
    successfulUpdates: t.record(
      t.string,
      t.array(t.record(t.string, t.string)),
    ),
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
   * Mapping from core userId to preference store record
   */
  preferenceStoreRecords: t.record(t.string, PreferenceQueryResponseItem),
  /**
   * Store a cache of previous files read in
   */
  fileMetadata: t.record(t.string, FileMetadataState),
  /**
   * The set of successful uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  successfulUpdates: t.record(
    t.string,
    t.array(
      t.type({
        /** Time upload ran at */
        uploadedAt: t.string,
        /** The update body */
        update: PreferenceStorePurposeUpdate,
      }),
    ),
  ),
  /**
   * The set of successful uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  failingUpdates: t.record(
    t.string,
    t.array(
      t.type({
        /** Time upload ran at */
        uploadedAt: t.string,
        /** Attempts to upload that resulted in an error */
        error: t.string,
        /** The update body */
        update: PreferenceStorePurposeUpdate,
      }),
    ),
  ),
  /**
   * The set of pending uploads to Transcend
   * Mapping from userId to the upload metadata
   */
  pendingUpdates: t.record(t.string, PreferenceStorePurposeUpdate),
});

/** Override type */
export type PreferenceState = t.TypeOf<typeof PreferenceState>;
