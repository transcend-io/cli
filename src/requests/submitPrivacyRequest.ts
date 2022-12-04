import * as t from 'io-ts';
import { valuesOf, decodeCodec } from '@transcend-io/type-utils';
import {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  RequestAction,
  RequestStatus,
} from '@transcend-io/privacy-types';
import type { Got } from 'got';
import {
  PrivacyRequestInput,
  AttestedExtraIdentifiers,
} from './mapCsvRowsToRequestInputs';
import { AttributeInput } from './parseAttributesFromString';

export const PrivacyRequestResponse = t.type({
  id: t.string,
  link: t.string,
  status: valuesOf(RequestStatus),
  type: valuesOf(RequestAction),
  subjectType: t.string,
  email: t.string,
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
    attestedExtraIdentifiers = {},
    details = '',
    isTest = false,
    additionalAttributes = [],
  }: {
    /** Extra identifiers to upload */
    attestedExtraIdentifiers?: AttestedExtraIdentifiers;
    /** Whether or not the request is a test request */
    isTest?: boolean;
    /** Request details */
    details?: string;
    /** Additional attributes to tag the requests with */
    additionalAttributes?: AttributeInput[];
  } = {},
): Promise<PrivacyRequestResponse> {
  // Make the GraphQL request
  const response = await sombra
    .post('v1/data-subject-request', {
      json: {
        type: input.requestType,
        subject: {
          coreIdentifier: input.coreIdentifier,
          email: input.email,
          emailIsVerified: input.emailIsVerified,
          attestedExtraIdentifiers,
        },
        subjectType: input.subjectType,
        isSilent: input.isSilent,
        isTest,
        ...(input.locale ? { locale: input.locale } : {}),
        details,
        attributes: additionalAttributes,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        ...(input.dataSiloIds ? { dataSiloIds: input.dataSiloIds } : {}),
        ...(input.status ? { completedRequestStatus: input.status } : {}),
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
