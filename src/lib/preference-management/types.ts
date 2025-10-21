import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import * as t from 'io-ts';

/**
 * New response codec for the query endpoint
 */
export const ConsentPreferenceResponse = t.intersection([
  t.type({
    nodes: t.array(PreferenceQueryResponseItem),
  }),
  t.partial({
    /** Cursor for next page (opaque) */
    cursor: t.string,
  }),
]);

/**
 * Type override
 */
export type ConsentPreferenceResponse = t.TypeOf<
  typeof ConsentPreferenceResponse
>;

/** Identifier filter (new shape) */
export type PreferenceIdentifier = {
  /** e.g., "email", "phone" */
  name: string;
  /** identifier value */
  value: string;
};

/** Filter shape for the new query endpoint */
export type PreferencesQueryFilter = {
  /** Identifiers to filter by */
  identifiers?: PreferenceIdentifier[];
  /** Consent collection time */
  timestampBefore?: string;
  /** Consent collection time */
  timestampAfter?: string;
  /** System updatedAt time */
  system?: {
    /** Updated before this time */
    updatedBefore?: string;
    /** Updated after this time */
    updatedAfter?: string;
  };
};

/** Which dimension we chunk on */
export type ChunkMode = 'timestamp' | 'updated';
