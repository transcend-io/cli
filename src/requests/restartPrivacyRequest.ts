import * as t from 'io-ts';
import groupBy from 'lodash/groupBy';
import { apply, decodeCodec } from '@transcend-io/type-utils';
import { IdentifierType } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import { PrivacyRequest, RequestIdentifier } from '../graphql';
import { IDENTIFIER_BLOCK_LIST } from './constants';
import { PrivacyRequestResponse } from './submitPrivacyRequest';

/**
 * Restart a privacy request to the Transcend API
 *
 * @param sombra - Sombra instance configured to make requests
 * @param request - Request to restart
 * @param input - Request input
 * @returns Successfully submitted request
 */
export async function restartPrivacyRequest(
  sombra: Got,
  request: PrivacyRequest,
  {
    sendEmailReceipt = false,
    skipWaitingPeriod = false,
    requestIdentifiers = [],
  }: {
    /** List of request identifiers to include */
    requestIdentifiers?: RequestIdentifier[];
    /** When true, send an email receipt to data subject */
    sendEmailReceipt?: boolean;
    /** Whether to skip waiting period */
    skipWaitingPeriod?: boolean;
  } = {},
): Promise<PrivacyRequestResponse> {
  // Make the GraphQL request
  const response = await sombra
    .post('v1/data-subject-request', {
      json: {
        type: request.type,
        subject: {
          coreIdentifier: request.coreIdentifier,
          email: request.email,
          emailIsVerified: true,
          ...(requestIdentifiers.length > 0
            ? {
                attestedExtraIdentifiers: apply(
                  groupBy(
                    requestIdentifiers
                      .filter(
                        (ri) =>
                          // these are already submitted above
                          !(
                            ri.name === 'email' && ri.value === request.email
                          ) && !IDENTIFIER_BLOCK_LIST.includes(ri.name),
                      )
                      .map((ri) => ({
                        ...ri,
                        type: Object.values(IdentifierType).includes(
                          ri.name as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                        )
                          ? ri.name
                          : IdentifierType.Custom,
                      })),
                    'type',
                  ),
                  (values, type) =>
                    values.map(({ name, value }) => ({
                      ...(type === IdentifierType.Custom ? { name } : {}),
                      value,
                    })),
                ),
              }
            : {}),
        },
        requestId: request.id,
        subjectType: request.subjectType,
        isSilent: request.isSilent,
        isTest: request.isTest,
        locale: request.locale,
        skipWaitingPeriod,
        createdAt: request.createdAt,
        details: `Restarted by Transcend cli: "tr-request-restart" - ${request.details}`,
        skipSendingReceipt: !sendEmailReceipt,
      },
    })
    .json();

  const { request: requestResponse } = decodeCodec(
    t.type({
      request: PrivacyRequestResponse,
    }),
    response,
  );
  return requestResponse;
}
