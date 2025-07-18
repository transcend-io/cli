import { RequestAction } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Got } from 'got';
import * as t from 'io-ts';

export const CronIdentifier = t.type({
  /** The identifier value */
  identifier: t.string,
  /** The type of identifier */
  type: t.string,
  /** The core identifier of the request */
  coreIdentifier: t.string,
  /** The ID of the underlying data silo */
  dataSiloId: t.string,
  /** The ID of the underlying request */
  requestId: t.string,
  /** The request nonce */
  nonce: t.string,
  /** The time the request was created */
  requestCreatedAt: t.string,
  /** The number of days until the request is overdue */
  daysUntilOverdue: t.number,
  /** Request attributes */
  attributes: t.array(
    t.type({
      key: t.string,
      values: t.array(t.string),
    }),
  ),
});

/** Type override */
export type CronIdentifier = t.TypeOf<typeof CronIdentifier>;

/**
 * Pull a offset of identifiers for a cron job
 *
 * @see https://docs.transcend.io/docs/api-reference/GET/v1/data-silo/(id)/pending-requests/(type)
 * @param sombra - Sombra instance configured to make requests
 * @param options - Additional options
 * @returns Successfully submitted request
 */
export async function pullCronPageOfIdentifiers(
  sombra: Got,
  {
    dataSiloId,
    limit = 100,
    offset = 0,
    requestType,
  }: {
    /** Data Silo ID */
    dataSiloId: string;
    /** Type of request */
    requestType: RequestAction;
    /** Number of identifiers to pull in */
    limit?: number;
    /** Page to pull in */
    offset?: number;
  },
): Promise<CronIdentifier[]> {
  try {
    // Make the GraphQL request
    const response = await sombra
      .get(`v1/data-silo/${dataSiloId}/pending-requests/${requestType}`, {
        searchParams: {
          offset,
          limit,
        },
      })
      .json();

    const { items } = decodeCodec(
      t.type({
        items: t.array(CronIdentifier),
      }),
      response,
    );
    return items;
  } catch (error) {
    throw new Error(
      `Received an error from server: ${
        error?.response?.body || error?.message
      }`,
    );
  }
}
