import { applyEnum, valuesOf } from '@transcend-io/type-utils';
import { LanguageKey } from '@transcend-io/internationalization';
import {
  CompletedRequestStatus,
  RequestAction,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';
import * as t from 'io-ts';

export const NONE = '[NONE]' as const;
export const BULK_APPLY = '[APPLY VALUE TO ALL ROWS]' as const;
export const BLANK = '<blank>' as const;

/** These are uploaded at the top level of the request */
export const IDENTIFIER_BLOCK_LIST = ['email', 'coreIdentifier'];

/**
 * Column names to map
 */
export enum ColumnName {
  /** The title of the email column */
  Email = 'email',
  /** The title of the core identifier column */
  CoreIdentifier = 'coreIdentifier',
  /** The title of the requestType column */
  RequestType = 'requestType',
  /** The title of the subjectType column */
  SubjectType = 'subjectType',
  /** The title of the locale column */
  Locale = 'locale',
  /** The country */
  Country = 'country',
  /** The country sub division */
  CountrySubDivision = 'countrySubDivision',
  /** The title of the requestStatus column */
  RequestStatus = 'requestStatus',
  /** The title of the createdAt column */
  CreatedAt = 'createdAt',
  /** The title of the dataSiloIds column */
  DataSiloIds = 'dataSiloIds',
}

/** These parameters are required in the Transcend DSR API */
export const IS_REQUIRED: { [k in ColumnName]: boolean } = {
  [ColumnName.Email]: false,
  [ColumnName.CoreIdentifier]: true,
  [ColumnName.RequestType]: true,
  [ColumnName.SubjectType]: true,
  [ColumnName.RequestStatus]: false,
  [ColumnName.CreatedAt]: false,
  [ColumnName.DataSiloIds]: false,
  [ColumnName.Locale]: false,
  [ColumnName.Country]: false,
  [ColumnName.CountrySubDivision]: false,
};

/** These parameters can be specified for the entire CSV set if needed */
export const CAN_APPLY_IN_BULK: { [k in ColumnName]?: boolean } = {
  [ColumnName.RequestType]: true,
  [ColumnName.SubjectType]: true,
};

// Cache state
export const CachedFileState = t.type({
  /** Mapping between the default request input column names and the CSV column name for that input */
  columnNames: t.partial(applyEnum(ColumnName, () => t.string)),
  /** Mapping between the identifier names and the CSV column name for that input */
  identifierNames: t.record(t.string, t.string),
  /** Mapping between the request attribute inputs and the CSV column name for that input */
  attributeNames: t.record(t.string, t.string),
  /** Mapping between CSV request type and Transcend Request Action */
  requestTypeToRequestAction: t.record(t.string, valuesOf(RequestAction)),
  /** Mapping between CSV data subject type and the name of the data subject in Transcend */
  subjectTypeToSubjectName: t.record(t.string, t.string),
  /** Mapping between language imported and Transcend locale code */
  languageToLocale: t.record(t.string, valuesOf(LanguageKey)),
  /** Mapping between region and country code */
  regionToCountry: t.record(
    t.string,
    valuesOf({ ...IsoCountryCode, [NONE]: NONE }),
  ),
  /** Mapping between region and country sub division code */
  regionToCountrySubDivision: t.record(
    t.string,
    valuesOf({ ...IsoCountrySubdivisionCode, [NONE]: NONE }),
  ),
  /** Mapping between request status in import to Transcend request status */
  statusToRequestStatus: t.record(
    t.string,
    valuesOf({ ...CompletedRequestStatus, [NONE]: NONE }),
  ),
});

/** Type override */
export type CachedFileState = t.TypeOf<typeof CachedFileState>;

/**
 * Successfully processed request
 */
export const SuccessfulRequest = t.type({
  id: t.string,
  link: t.string,
  rowIndex: t.number,
  coreIdentifier: t.string,
  attemptedAt: t.string,
});

/** Type override */
export type SuccessfulRequest = t.TypeOf<typeof SuccessfulRequest>;

// Cache state
export const CachedRequestState = t.type({
  /** Set of privacy requests that failed to upload */
  failingRequests: t.array(t.record(t.string, t.any)),
  /** Successfully uploaded requests */
  successfulRequests: t.array(SuccessfulRequest),
  /** Duplicate requests */
  duplicateRequests: t.array(
    t.type({
      rowIndex: t.number,
      coreIdentifier: t.string,
      attemptedAt: t.string,
    }),
  ),
});

/** Type override */
export type CachedRequestState = t.TypeOf<typeof CachedRequestState>;
