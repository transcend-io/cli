import { GraphQLClient } from 'graphql-request';
import colors from 'colors';
import type { PersistedState } from '@transcend-io/persisted-state';
import {
  CompletedRequestStatus,
  RequestAction,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';
import { LanguageKey } from '@transcend-io/internationalization';
import { ObjByString } from '@transcend-io/type-utils';
import { logger } from '../logger';
import { makeGraphQLRequest, DataSubject, DATA_SUBJECTS } from '../graphql';
import { CachedFileState, NONE, ColumnName } from './constants';
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
    state,
    columnNameMap,
  }: {
    /** State value to write cache to */
    state: PersistedState<typeof CachedFileState>;
    /** Mapping of column names */
    columnNameMap: ColumnNameMap;
  },
): Promise<void> {
  // Get mapped value
  const getMappedName = (attribute: ColumnName): string =>
    state.getValue('columnNames', attribute) || columnNameMap[attribute]!;

  // Fetch all data subjects in the organization
  const { internalSubjects } = await makeGraphQLRequest<{
    /** Query response */
    internalSubjects: DataSubject[];
  }>(client, DATA_SUBJECTS);

  // Map RequestAction
  logger.info(
    colors.magenta('Determining mapping of columns for request action'),
  );
  const requestTypeToRequestAction: { [k in string]: RequestAction } =
    await mapEnumValues(
      getUniqueValuesForColumn(requests, getMappedName(ColumnName.RequestType)),
      Object.values(RequestAction),
      state.getValue('requestTypeToRequestAction'),
    );
  await state.setValue(
    requestTypeToRequestAction,
    'requestTypeToRequestAction',
  );

  // Map data subject type
  logger.info(colors.magenta('Determining mapping of columns for subject'));
  const subjectTypeToSubjectName: { [k in string]: string } =
    await mapEnumValues(
      getUniqueValuesForColumn(requests, getMappedName(ColumnName.SubjectType)),
      internalSubjects.map(({ type }) => type),
      state.getValue('subjectTypeToSubjectName'),
    );
  await state.setValue(subjectTypeToSubjectName, 'subjectTypeToSubjectName');

  // Map locale
  logger.info(colors.magenta('Determining mapping of columns for locale'));
  const languageToLocale: { [k in string]: LanguageKey } = await mapEnumValues(
    getUniqueValuesForColumn(requests, getMappedName(ColumnName.Locale)),
    Object.values(LanguageKey),
    state.getValue('languageToLocale'),
  );
  await state.setValue(languageToLocale, 'languageToLocale');
  logger.info(
    colors.magenta('Determining mapping of columns for request status'),
  );

  // Map request status
  logger.info(
    colors.magenta('Determining mapping of columns for request status'),
  );
  const requestStatusColumn = getMappedName(ColumnName.RequestStatus);
  const statusToRequestStatus: {
    [k in string]: CompletedRequestStatus | typeof NONE;
  } =
    requestStatusColumn === NONE
      ? {}
      : await mapEnumValues(
          getUniqueValuesForColumn(requests, requestStatusColumn),
          [...Object.values(CompletedRequestStatus), NONE],
          state.getValue('statusToRequestStatus'),
        );
  await state.setValue(statusToRequestStatus, 'statusToRequestStatus');

  // Map country
  logger.info(colors.magenta('Determining mapping of columns for country'));
  const countryColumn = getMappedName(ColumnName.Country);
  const regionToCountry: {
    [k in string]: IsoCountryCode | typeof NONE;
  } =
    countryColumn === NONE
      ? {}
      : await mapEnumValues(
          getUniqueValuesForColumn(requests, countryColumn),
          [...Object.values(IsoCountryCode), NONE],
          state.getValue('regionToCountry'),
        );
  await state.setValue(regionToCountry, 'regionToCountry');

  // Map country sub division
  logger.info(
    colors.magenta('Determining mapping of columns for country sub division'),
  );
  const countrySubDivisionColumn = getMappedName(ColumnName.CountrySubDivision);
  const regionToCountrySubDivision: {
    [k in string]: IsoCountrySubdivisionCode | typeof NONE;
  } =
    countrySubDivisionColumn === NONE
      ? {}
      : await mapEnumValues(
          getUniqueValuesForColumn(requests, countrySubDivisionColumn),
          [...Object.values(IsoCountrySubdivisionCode), NONE],
          state.getValue('regionToCountrySubDivision'),
        );
  await state.setValue(
    regionToCountrySubDivision,
    'regionToCountrySubDivision',
  );
}
