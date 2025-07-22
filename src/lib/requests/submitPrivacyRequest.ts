import {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  RequestAction,
  RequestStatus,
} from '@transcend-io/privacy-types';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import type { Got } from 'got';
import * as t from 'io-ts';
import { uniq } from 'lodash-es';
import { PrivacyRequestInput } from './mapCsvRowsToRequestInputs';
import { ParsedAttributeInput } from './parseAttributesFromString';

export const PrivacyRequestResponse = t.type({
  id: t.string,
  link: t.string,
  status: valuesOf(RequestStatus),
  type: valuesOf(RequestAction),
  subjectType: t.string,
  email: t.union([t.null, t.string]),
  coreIdentifier: t.string,
  isSilent: t.boolean,
  isTest: t.boolean,
  country: t.union([t.null, valuesOf(IsoCountryCode)]),
  countrySubDivision: t.union([t.null, valuesOf(IsoCountrySubdivisionCode)]),
  attributeValues: t.array(
    t.type({
      attributeKey: t.type({ name: t.string }),
      name: t.string,
    }),
  ),
});

/** Type override */
export type PrivacyRequestResponse = t.TypeOf<typeof PrivacyRequestResponse>;

/**
 * Submit a privacy request to the Transcend API
 *
 * @param sombra - Sombra instance configured to make requests
 * @param input - Request input
 * @param options - Additional options
 * @returns Successfully submitted request
 */
export async function submitPrivacyRequest(
  sombra: Got,
  input: PrivacyRequestInput,
  {
    details = '',
    isTest = false,
    emailIsVerified = true,
    skipSendingReceipt = false,
    isSilent = true,
    additionalAttributes = [],
  }: {
    /** Whether or not the request is a test request */
    isTest?: boolean;
    /** Whether or not the request is in silent mode */
    isSilent?: boolean;
    /** Whether the email is verified up front */
    emailIsVerified?: boolean;
    /** When true, skip sending of the email receipt */
    skipSendingReceipt?: boolean;
    /** Request details */
    details?: string;
    /** Additional attributes to tag the requests with */
    additionalAttributes?: ParsedAttributeInput[];
  } = {},
): Promise<PrivacyRequestResponse> {
  // Merge the per-request attributes with the
  // global attributes
  const mergedAttributes = [...additionalAttributes];
  for (const attribute of input.attributes || []) {
    const existing = mergedAttributes.find(
      (attribute_) => attribute_.key === attribute.key,
    );
    if (existing) {
      existing.values.push(...attribute.values);
      existing.values = uniq(existing.values);
    } else {
      mergedAttributes.push(attribute);
    }
  }

  // Make the GraphQL request
  let response: unknown;
  try {
    response = await sombra
      .post('v1/data-subject-request', {
        json: {
          type: input.requestType,
          subject: {
            coreIdentifier: input.coreIdentifier,
            email: input.email,
            emailIsVerified,
            attestedExtraIdentifiers: input.attestedExtraIdentifiers,
          },
          subjectType: input.subjectType,
          isSilent,
          isTest,
          skipSendingReceipt,
          ...(input.locale ? { locale: input.locale } : {}),
          details,
          attributes: mergedAttributes,
          ...(input.country || input.countrySubDivision
            ? {
                region: {
                  ...(input.country
                    ? {
                        country: input.country,
                      }
                    : input.countrySubDivision
                      ? { country: input.countrySubDivision.split('-')[0] }
                      : {}),
                  ...(input.countrySubDivision
                    ? { countrySubDivision: input.countrySubDivision }
                    : {}),
                },
              }
            : {}),
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
          ...(input.dataSiloIds ? { dataSiloIds: input.dataSiloIds } : {}),
          ...(input.status ? { completedRequestStatus: input.status } : {}),
        },
      })
      .json();
  } catch (error) {
    throw new Error(
      `Received an error from server: ${
        error?.response?.body || error?.message
      }`,
    );
  }

  const { request: requestResponse } = decodeCodec(
    t.type({
      request: PrivacyRequestResponse,
    }),
    response,
  );
  return requestResponse;
}
