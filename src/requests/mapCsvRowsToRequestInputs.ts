import { LanguageKey } from '@transcend-io/internationalization';
import {
  NORMALIZE_PHONE_NUMBER,
  CompletedRequestStatus,
  RequestAction,
  IdentifierType,
} from '@transcend-io/privacy-types';
import { ObjByString } from '@transcend-io/type-utils';

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
import type { AttributeInput } from './parseAttributesFromString';
import { AttributeNameMap } from './mapColumnsToAttributes';
import { IdentifierNameMap } from './mapColumnsToIdentifiers';

/**
 * Shape of additional identifiers
 */
export type AttestedExtraIdentifiers = {
  [k in IdentifierType]?: {
    /** Name of identifier */
    name?: string;
    /** Value of identifier */
    value: string;
  }[];
};

export interface PrivacyRequestInput {
  /** Email of user */
  email: string;
  /** Extra identifiers */
  attestedExtraIdentifiers: AttestedExtraIdentifiers;
  /** Core identifier for user */
  coreIdentifier: string;
  /** Action type being submitted  */
  requestType: RequestAction;
  /** Type of data subject */
  subjectType: string;
  /** Attribute inputs */
  attributes?: AttributeInput[];
  /** The status that the request should be created as */
  status?: CompletedRequestStatus;
  /** The time that the request was created */
  createdAt?: Date;
  /** Data silo IDs to submit for */
  dataSiloIds?: string[];
  /** Language key to map to */
  locale?: LanguageKey;
}

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
    return normalized.startsWith('+')
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
 * @param cached - The cached set of mapping values
 * @param options - Options
 * @returns [raw input, request input] list
 */
export function mapCsvRowsToRequestInputs(
  requestInputs: ObjByString[],
  cached: CachedFileState,
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
    cached.columnNames[attribute] || columnNameMap[attribute]!;
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
            // Initialize
            if (!attestedExtraIdentifiers[identifierType]) {
              attestedExtraIdentifiers[identifierType] = [];
            }

            // Add the identifier
            attestedExtraIdentifiers[identifierType]!.push({
              value: normalizeIdentifierValue(
                identifierValue,
                identifierType,
                defaultPhoneCountryCode,
              ),
              name: identifierName,
            });
          }
        });

      // The extra attributes to upload for this request
      const attributes: AttributeInput[] = [];
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
              ? cached.requestTypeToRequestAction[BLANK]
              : cached.requestTypeToRequestAction[input[requestTypeColumn]],
          subjectType:
            dataSubjectTypeColumn === BULK_APPLY
              ? cached.subjectTypeToSubjectName[BLANK]
              : cached.subjectTypeToSubjectName[input[dataSubjectTypeColumn]],
          ...(getMappedName(ColumnName.Locale) !== NONE &&
          input[getMappedName(ColumnName.Locale)]
            ? {
                locale:
                  cached.languageToLocale[
                    input[getMappedName(ColumnName.Locale)]
                  ],
              }
            : {}),
          ...(getMappedName(ColumnName.RequestStatus) !== NONE &&
          cached.statusToRequestStatus[
            input[getMappedName(ColumnName.RequestStatus)]
          ] !== NONE &&
          input[getMappedName(ColumnName.RequestStatus)]
            ? {
                status: cached.statusToRequestStatus[
                  input[getMappedName(ColumnName.RequestStatus)]
                ] as CompletedRequestStatus,
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
