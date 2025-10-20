import * as t from 'io-ts';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Got } from 'got';
import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

/** New response codec for the query endpoint */
export const ConsentPreferenceResponse = t.intersection([
  t.type({
    nodes: t.array(PreferenceQueryResponseItem),
  }),
  t.partial({
    /** Cursor for next page (opaque) */
    cursor: t.string,
  }),
]);

/** Type override */
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
  /** Filter by user identifiers (new shape) */
  identifiers?: PreferenceIdentifier[];
  /** Filter by when consent was collected */
  timestampBefore?: string;
  /** Timestamp after consent was collected */
  timestampAfter?: string;
  /** Filter by system metadata (updatedAt window, etc.) */
  system?: {
    /** Filter by record updated at date before */
    updatedBefore?: string;
    /** Filter by record updated at date after */
    updatedAfter?: string;
  };
};

/**
 * Fetch consent preferences for the managed consent database (new query endpoint)
 *
 * Uses POST /v1/preferences/{partition}/query with cursor pagination.
 *
 * @param sombra - Sombra instance configured to make requests (should include auth headers)
 * @param options - Query options
 * @returns All consent preference nodes accumulated across pages
 */
export async function fetchConsentPreferences(
  sombra: Got,
  {
    partition,
    filterBy = {},
    limit = 50,
  }: {
    /** Partition key to fetch (moved to URL path on new endpoint) */
    partition: string;
    /** Query filter (wrapped under "filter" in request body) */
    filterBy?: PreferencesQueryFilter;
    /** Number of users per page (1–50 per API spec) */
    limit?: number;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const data: PreferenceQueryResponseItem[] = [];

  // Cursor-based pagination per new endpoint
  let cursor: string | undefined;

  // Build the filter payload, omitting empty filter
  const hasFilter =
    filterBy &&
    (Object.keys(filterBy).length > 0 ||
      (filterBy.system && Object.keys(filterBy.system).length > 0));

  // Enforce API max (defensive; backend also validates)
  const pageSize = Math.max(1, Math.min(50, limit ?? 50));

  // Keep fetching until no cursor is returned
  // (The API returns an opaque cursor string for the next page)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body: {
      /** Filter by user identifiers (new shape) */
      filter?: PreferencesQueryFilter;
      /** Cursor for pagination */
      cursor?: string;
      /** Number of records per page */
      limit: number;
    } = { limit: pageSize };

    if (hasFilter) {
      body.filter = filterBy;
    }
    if (cursor) {
      body.cursor = cursor;
    }

    const response = await sombra
      .post(`v1/preferences/${encodeURIComponent(partition)}/query`, {
        json: body,
      })
      .json();

    const { nodes, cursor: nextCursor } = decodeCodec(
      ConsentPreferenceResponse,
      response,
    );

    if (!nodes || nodes.length === 0) {
      break;
    }

    data.push(...nodes);

    if (!nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  return data;
}
