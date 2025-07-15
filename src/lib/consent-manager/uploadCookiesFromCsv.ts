import colors from 'colors';
import { logger } from '../logger';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient, syncCookies } from '../graphql';
import { readCsv } from '../requests/readCsv';
import { CookieInput, CookieCsvInput } from '../codecs';
import { splitCsvToList } from '../requests';
import { DEFAULT_TRANSCEND_API } from '../constants';

const OMIT_COLUMNS = [
  'ID',
  'Activity',
  'Encounters',
  'Last Seen At',
  'Has Native Do Not Sell/Share Support',
  'IAB USP API Support',
  'Service Description',
  'Website URL',
  'Categories of Recipients',
];

/**
 * Upload a set of cookies from CSV
 *
 * @param options - Options
 */
export async function uploadCookiesFromCsv({
  auth,
  trackerStatus,
  file,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Sombra API key authentication */
  trackerStatus: ConsentTrackerStatus;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<void> {
  // Build a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Read from CSV the set of cookie inputs
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const cookieInputs = readCsv(file, CookieCsvInput);

  // Convert these  inputs into a format that the other function can use
  const validatedCookieInputs = cookieInputs.map(
    ({
      'Is Regex?': isRegex,
      Notes,
      // TODO: https://transcend.height.app/T-26391 - export in CSV
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Service,
      Purpose,
      Status,
      Owners,
      Teams,
      Name,
      ...rest
    }): CookieInput => ({
      ...(typeof isRegex === 'string'
        ? { isRegex: isRegex.toLowerCase() === 'true' }
        : {}),
      name: Name,
      description: Notes,
      trackingPurposes: splitCsvToList(Purpose),
      // TODO: https://transcend.height.app/T-26391
      // service: Service,
      // Apply the trackerStatus to all values in the CSV -> allows for customer to define tracker status
      // on a row by row basis if needed
      status: Status || trackerStatus,
      owners: Owners ? splitCsvToList(Owners) : undefined,
      teams: Teams ? splitCsvToList(Teams) : undefined,
      // all remaining options are attribute
      attributes: Object.entries(rest)
        // filter out native columns that are exported from the admin dashboard
        // but not custom attributes
        .filter(([key]) => !OMIT_COLUMNS.includes(key))
        .map(([key, value]) => ({
          key,
          values: splitCsvToList(value),
        })),
    }),
  );

  // Upload the cookies into Transcend dashboard
  const syncedCookies = await syncCookies(client, validatedCookieInputs);

  // Log errors
  if (!syncedCookies) {
    logger.error(
      colors.red(
        'Encountered error(s) syncing cookies from CSV, see logs above for more info. ',
      ),
    );
    process.exit(1);
  }
}
