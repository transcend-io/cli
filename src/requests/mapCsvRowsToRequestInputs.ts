import { LanguageKey } from '@transcend-io/internationalization';
import { ObjByString } from '@transcend-io/type-utils';
import {
  CompletedRequestStatus,
  RequestAction,
  IdentifierType,
} from '@transcend-io/privacy-types';

import { CachedFileState, ColumnName, NONE } from './constants';
import { ColumnNameMap } from './mapCsvColumnsToApi';
import { splitCsvToList } from './splitCsvToList';

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
  /** Email is verified */
  emailIsVerified: boolean;
  /** Core identifier for user */
  coreIdentifier: string;
  /** Action type being submitted  */
  requestType: RequestAction;
  /** Type of data subject */
  subjectType: string;
  /** The status that the request should be created as */
  status?: CompletedRequestStatus;
  /** The time that the request was created */
  createdAt?: Date;
  /** Whether in silent mode */
  isSilent: boolean;
  /** Data silo IDs to submit for */
  dataSiloIds?: string[];
  /** Language key to map to */
  locale?: LanguageKey;
}

/**
 * Take the raw rows in a CSV upload, and map those rows to the request
 * input shape that can be passed to the Transcend API to submit a privacy
 * request.
 *
 * @param requestInputs - CSV of requests to be uploaded
 * @param cached - The cached set of mapping values
 * @param columnNameMap - Mapping of column names
 * @returns [raw input, request input] list
 */
export function mapCsvRowsToRequestInputs(
  requestInputs: ObjByString[],
  cached: CachedFileState,
  columnNameMap: ColumnNameMap,
): [Record<string, string>, PrivacyRequestInput][] {
  // map the CSV to request input
  const getMappedName = (attribute: ColumnName): string =>
    cached.columnNames[attribute] || columnNameMap[attribute]!;
  return requestInputs.map(
    (input): [Record<string, string>, PrivacyRequestInput] => [
      input,
      {
        email: input[getMappedName(ColumnName.Email)],
        emailIsVerified: true,
        isSilent: true,
        coreIdentifier: input[getMappedName(ColumnName.CoreIdentifier)],
        requestType:
          cached.requestTypeToRequestAction[
            input[getMappedName(ColumnName.RequestType)]
          ],
        subjectType:
          cached.subjectTypeToSubjectName[
            input[getMappedName(ColumnName.SubjectType)]
          ] || 'Customer',
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
    ],
  );
}
