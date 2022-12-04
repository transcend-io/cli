import { GraphQLClient } from 'graphql-request';
import type { PersistedState } from '@transcend-io/persisted-state';
import {
  CompletedRequestStatus,
  RequestAction,
} from '@transcend-io/privacy-types';
import { LanguageKey } from '@transcend-io/internationalization';
import { ObjByString } from '@transcend-io/type-utils';
import { logger } from '../logger';
import { makeGraphQLRequest, DataSubject, DATA_SUBJECTS } from '../graphql';
import { CachedState, NONE, ColumnName } from './constants';
import { mapEnumValues } from './mapEnumValues';
import { ColumnNameMap } from './mapCsvColumnsToApi';
import { getUniqueValuesForColumn } from './getUniqueValuesForColumn';

/**
 * Map the values in a CSV to the enum values in Transcend
 *
 * @param client - GraphQL client
 * @param requests - Set of privacy requests
 * @param options - Options
 */
export async function mapRequestEnumValues(
  client: GraphQLClient,
  requests: ObjByString[],
  {
    fileName,
    state,
    columnNameMap,
  }: {
    /** Name of fileName to be cached */
    fileName: string;
    /** State value to write cache to */
    state: PersistedState<typeof CachedState>;
    /** Mapping of column names */
    columnNameMap: ColumnNameMap;
  },
): Promise<void> {
  // Current cache value
  const cached = state.getValue(fileName);

  // Get mapped value
  const getMappedName = (attribute: ColumnName): string =>
    cached.columnNames[attribute] || columnNameMap[attribute]!;

  // Fetch all data subjects in the organization
  const { internalSubjects } = await makeGraphQLRequest<{
    /** Query response */
    internalSubjects: DataSubject[];
  }>(client, DATA_SUBJECTS);

  logger.info('Determine mapping for request action');
  const requestTypeToRequestAction: { [k in string]: RequestAction } =
    await mapEnumValues(
      getUniqueValuesForColumn(requests, getMappedName(ColumnName.RequestType)),
      Object.values(RequestAction),
      cached.requestTypeToRequestAction || {},
    );
  cached.requestTypeToRequestAction = requestTypeToRequestAction;
  state.setValue(cached, fileName);
  logger.info('Determine mapping for subject');
  const subjectTypeToSubjectName: { [k in string]: string } =
    await mapEnumValues(
      getUniqueValuesForColumn(requests, getMappedName(ColumnName.SubjectType)),
      internalSubjects.map(({ type }) => type),
      cached.subjectTypeToSubjectName || {},
    );
  cached.subjectTypeToSubjectName = subjectTypeToSubjectName;
  state.setValue(cached, fileName);
  logger.info('Determine mapping for locale');
  const languageToLocale: { [k in string]: LanguageKey } = await mapEnumValues(
    getUniqueValuesForColumn(requests, getMappedName(ColumnName.Locale)),
    Object.values(LanguageKey),
    cached.languageToLocale || {},
  );
  cached.languageToLocale = languageToLocale;
  state.setValue(cached, fileName);
  logger.info('Determine mapping for request status');
  const requestStatusColumn = getMappedName(ColumnName.RequestStatus);
  const statusToRequestStatus: {
    [k in string]: CompletedRequestStatus | 'NONE';
  } =
    requestStatusColumn === NONE
      ? {}
      : await mapEnumValues(
          getUniqueValuesForColumn(requests, requestStatusColumn),
          [...Object.values(CompletedRequestStatus), NONE],
          cached.statusToRequestStatus || {},
        );
  cached.statusToRequestStatus = statusToRequestStatus;
  state.setValue(cached, fileName);
}
