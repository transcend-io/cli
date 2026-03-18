import { groupBy } from 'lodash-es';
import type { PrivacyRequest, RequestIdentifier } from '../graphql';

export interface ExportedPrivacyRequest extends PrivacyRequest {
  /** Request identifiers */
  requestIdentifiers: RequestIdentifier[];
}

/** A single CSV row */
export type CsvRow = { [k in string]: string | null | number | boolean };

/**
 * Format a single privacy request (with optional identifiers) into a flat CSV row.
 *
 * @param request - The request with identifiers attached
 * @returns Flat object suitable for CSV output
 */
export function formatRequestForCsv({
  attributeValues,
  requestIdentifiers,
  id,
  email,
  type,
  status,
  subjectType,
  details,
  createdAt,
  successfullyCompletedAt,
  country,
  locale,
  origin,
  countrySubDivision,
  isSilent,
  isTest,
  coreIdentifier,
  purpose,
  ...request
}: ExportedPrivacyRequest): CsvRow {
  return {
    'Request ID': id,
    'Created At': createdAt,
    'Successfully Completed At': successfullyCompletedAt || '',
    Email: email,
    'Core Identifier': coreIdentifier,
    'Request Type': type,
    'Data Subject Type': subjectType,
    Status: status,
    Country: country,
    'Country Sub Division': countrySubDivision,
    Details: details,
    Origin: origin,
    'Silent Mode': isSilent,
    'Is Test Request': isTest,
    Language: locale,
    'Purpose Trigger Name': purpose?.title || purpose?.name || '',
    'Purpose Trigger Value': purpose?.consent?.toString() || '',
    ...(purpose?.enrichedPreferences || []).reduce(
      (acc: Record<string, string | boolean>, p) => {
        const title = p.preferenceTopic?.title.defaultMessage || p.name;
        return title
          ? {
              ...acc,
              [title]: p.selectValues
                ? p.selectValues.map((x) => x.name).join(';')
                : p.selectValue?.name || p.booleanValue,
            }
          : acc;
      },
      {},
    ),
    ...request,
    ...Object.entries(groupBy(attributeValues, 'attributeKey.name')).reduce(
      (acc, [name, values]) =>
        Object.assign(acc, {
          [name]: values.map(({ name: n }) => n).join(','),
        }),
      {},
    ),
    ...Object.entries(groupBy(requestIdentifiers, 'name')).reduce(
      (acc, [name, values]) =>
        Object.assign(acc, {
          [name]: values.map(({ value }) => value).join(','),
        }),
      {},
    ),
  };
}
