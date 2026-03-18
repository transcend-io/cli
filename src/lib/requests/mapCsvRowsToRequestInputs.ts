import { LOCALE_KEY } from '@transcend-io/internationalization';
import { DateFromISOString } from 'io-ts-types';

import * as t from 'io-ts';
import type { PersistedState } from '@transcend-io/persisted-state';
import {
  NORMALIZE_PHONE_NUMBER,
  CompletedRequestStatus,
  RequestAction,
  IdentifierType,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';
import { ObjByString, valuesOf } from '@transcend-io/type-utils';

import {
  CachedFileState,
  BLANK,
  BULK_APPLY,
  ColumnName,
  NONE,
} from './constants';
import { AttributeKey } from '../graphql';
import { ColumnNameMap } from './mapCsvColumnsToApi';
import { splitCsvToList } from './splitCsvToList';
import { ParsedAttributeInput } from './parseAttributesFromString';
import { AttributeNameMap } from './mapColumnsToAttributes';
import { IdentifierNameMap } from './mapColumnsToIdentifiers';

/**
 * Shape of additional identifiers
 *
 * key of object is IdentifierType
 */
export const AttestedExtraIdentifiers = t.record(
  t.string,
  t.array(
    t.intersection([
      t.type({
        /** Value of identifier */
        value: t.string,
      }),
      t.partial({
        /** Name of identifier - option for non-custom identifier types */
        name: t.string,
      }),
    ]),
  ),
);

/** Type override */
export type AttestedExtraIdentifiers = t.TypeOf<
  typeof AttestedExtraIdentifiers
>;

export const PrivacyRequestInput = t.intersection([
  t.type({
    /** Email of user */
    email: t.string,
    /** Extra identifiers */
    attestedExtraIdentifiers: AttestedExtraIdentifiers,
    /** Core identifier for user */
    coreIdentifier: t.string,
    /** Action type being submitted  */
    requestType: valuesOf(RequestAction),
    /** Type of data subject */
    subjectType: t.string,
  }),
  t.partial({
    /** Country */
    country: valuesOf(IsoCountryCode),
    /** Country sub division */
    countrySubDivision: valuesOf(IsoCountrySubdivisionCode),
    /** Attribute inputs */
    attributes: t.array(ParsedAttributeInput),
    /** The status that the request should be created as */
    status: valuesOf(CompletedRequestStatus),
    /** The time that the request was created */
    createdAt: DateFromISOString,
    /** Data silo IDs to submit for */
    dataSiloIds: t.array(t.string),
    /** Language key to map to */
    locale: valuesOf(LOCALE_KEY),
  }),
]);

/** Type override */
export type PrivacyRequestInput = t.TypeOf<typeof PrivacyRequestInput>;

/**
 * Transform the identifier value based on type
 *
 * @param identifierValue - Value of identifier
 * @param identifierType - Type of identifier
 * @param defaultPhoneCountryCode - Default country code for phone numbers
 * @returns Post-processed identifier
 */
export function normalizeIdentifierValue(
  identifierValue: string,
  identifierType: IdentifierType,
  defaultPhoneCountryCode: string,
): string {
  // Lowercase email
  if (identifierType === IdentifierType.Email) {
    return identifierValue.toLowerCase();
  }

  // Normalize phone number
  if (identifierType === IdentifierType.Phone) {
    const normalized = identifierValue
      .replace(NORMALIZE_PHONE_NUMBER, '')
      .replace(/[()]/g, '')
      .replace(/[–]/g, '')
      .replace(/[:]/g, '')
      .replace(/[‭‬]/g, '')
      .replace(/[A-Za-z]/g, '');
    return !normalized
      ? ''
      : normalized.startsWith('+')
      ? normalized
      : `+${defaultPhoneCountryCode}${normalized}`;
  }
  return identifierValue;
}

/**
 * Take the raw rows in a CSV upload, and map those rows to the request
 * input shape that can be passed to the Transcend API to submit a privacy
 * request.
 *
 * @param requestInputs - CSV of requests to be uploaded
 * @param state - The cached set of mapping values
 * @param options - Options
 * @returns [raw input, request input] list
 */
export function mapCsvRowsToRequestInputs(
  requestInputs: ObjByString[],
  state: PersistedState<typeof CachedFileState>,
  {
    columnNameMap,
    identifierNameMap,
    attributeNameMap,
    requestAttributeKeys,
    defaultPhoneCountryCode = '1', // US
  }: {
    /** Default country code */
    defaultPhoneCountryCode?: string;
    /** Mapping of column names */
    columnNameMap: ColumnNameMap;
    /** Mapping of identifier names */
    identifierNameMap: IdentifierNameMap;
    /** Mapping of attribute names */
    attributeNameMap: AttributeNameMap;
    /** Request attribute keys */
    requestAttributeKeys: AttributeKey[];
  },
): [Record<string, string>, PrivacyRequestInput][] {
  // map the CSV to request input
  const getMappedName = (attribute: ColumnName): string =>
    state.getValue('columnNames', attribute) || columnNameMap[attribute]!;
  return requestInputs.map(
    (input): [Record<string, string>, PrivacyRequestInput] => {
      // The extra identifiers to upload for this request
      const attestedExtraIdentifiers: AttestedExtraIdentifiers = {};
      Object.entries(identifierNameMap)
        // filter out skipped identifiers
        .filter(([, columnName]) => columnName !== NONE)
        .forEach(([identifierName, columnName]) => {
          // Determine the identifier type being specified
          const identifierType = Object.values(IdentifierType).includes(
            identifierName as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          )
            ? (identifierName as IdentifierType)
            : IdentifierType.Custom;

          // Only add the identifier if the value exists
          const identifierValue = input[columnName];
          if (identifierValue) {
            const normalized = normalizeIdentifierValue(
              identifierValue,
              identifierType,
              defaultPhoneCountryCode,
            );
            if (normalized) {
              // Initialize
              if (!attestedExtraIdentifiers[identifierType]) {
                attestedExtraIdentifiers[identifierType] = [];
              }

              // Add the identifier
              attestedExtraIdentifiers[identifierType]!.push({
                value: normalized,
                name: identifierName,
              });
            }
          }
        });

      // The extra attributes to upload for this request
      const attributes: ParsedAttributeInput[] = [];
      Object.entries(attributeNameMap)
        // filter out skipped attributes
        .filter(([, columnName]) => columnName !== NONE)
        .forEach(([attributeName, columnName]) => {
          // Only add the identifier if the value exists
          const attributeValueString = input[columnName];
          if (attributeValueString) {
            // Add the attribute
            const isMulti =
              requestAttributeKeys.find((attr) => attr.name === attributeName)
                ?.type === 'MULTI_SELECT';
            attributes.push({
              values: isMulti
                ? splitCsvToList(attributeValueString)
                : attributeValueString,
              key: attributeName,
            });
          }
        });

      const requestTypeColumn = getMappedName(ColumnName.RequestType);
      const dataSubjectTypeColumn = getMappedName(ColumnName.SubjectType);
      return [
        input,
        {
          email: input[getMappedName(ColumnName.Email)],
          attestedExtraIdentifiers,
          attributes,
          coreIdentifier: input[getMappedName(ColumnName.CoreIdentifier)],
          requestType:
            requestTypeColumn === BULK_APPLY
              ? state.getValue('requestTypeToRequestAction', BLANK)
              : state.getValue(
                  'requestTypeToRequestAction',
                  input[requestTypeColumn],
                ),
          subjectType:
            dataSubjectTypeColumn === BULK_APPLY
              ? state.getValue('subjectTypeToSubjectName', BLANK)
              : state.getValue(
                  'subjectTypeToSubjectName',
                  input[dataSubjectTypeColumn],
                ),
          ...(getMappedName(ColumnName.Locale) !== NONE &&
          input[getMappedName(ColumnName.Locale)]
            ? {
                locale: state.getValue(
                  'languageToLocale',
                  input[getMappedName(ColumnName.Locale)],
                ),
              }
            : {}),
          ...(getMappedName(ColumnName.Country) !== NONE &&
          input[getMappedName(ColumnName.Country)]
            ? {
                country: state.getValue(
                  'regionToCountry',
                  input[getMappedName(ColumnName.Country)],
                ) as IsoCountryCode,
              }
            : {}),
          ...(getMappedName(ColumnName.CountrySubDivision) !== NONE &&
          input[getMappedName(ColumnName.CountrySubDivision)]
            ? {
                countrySubDivision: state.getValue(
                  'regionToCountrySubDivision',
                  input[getMappedName(ColumnName.CountrySubDivision)],
                ) as IsoCountrySubdivisionCode,
              }
            : {}),
          ...(getMappedName(ColumnName.RequestStatus) !== NONE &&
          state.getValue(
            'statusToRequestStatus',
            input[getMappedName(ColumnName.RequestStatus)],
          ) !== NONE &&
          input[getMappedName(ColumnName.RequestStatus)]
            ? {
                status: state.getValue(
                  'statusToRequestStatus',
                  input[getMappedName(ColumnName.RequestStatus)],
                ) as CompletedRequestStatus,
              }
            : {}),
          ...(getMappedName(ColumnName.CreatedAt) !== NONE &&
          input[getMappedName(ColumnName.CreatedAt)]
            ? {
                createdAt: new Date(input[getMappedName(ColumnName.CreatedAt)]),
              }
            : {}),
          ...(getMappedName(ColumnName.DataSiloIds) !== NONE &&
          input[getMappedName(ColumnName.DataSiloIds)]
            ? {
                dataSiloIds: splitCsvToList(
                  input[getMappedName(ColumnName.DataSiloIds)],
                ),
              }
            : {}),
        },
      ];
    },
  );
}
