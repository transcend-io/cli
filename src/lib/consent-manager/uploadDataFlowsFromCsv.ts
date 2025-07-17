import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import colors from 'colors';
import { DataFlowCsvInput, DataFlowInput } from '../../codecs';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { buildTranscendGraphQLClient, syncDataFlows } from '../graphql';
import { splitCsvToList } from '../requests';
import { readCsv } from '../requests/readCsv';

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
 * Upload a set of data flows from CSV
 *
 * @param options - Options
 */
export async function uploadDataFlowsFromCsv({
  auth,
  trackerStatus,
  file,
  classifyService = false,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Sombra API key authentication */
  trackerStatus: ConsentTrackerStatus;
  /** classify data flow service if missing */
  classifyService?: boolean;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<void> {
  // Build a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Read from CSV the set of data flow inputs
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const dataFlowInputs = readCsv(file, DataFlowCsvInput);

  // Convert these data flow inputs into a format that the other function can use
  const validatedDataFlowInputs = dataFlowInputs.map(
    ({
      Type,
      Notes,
      // TODO: https://transcend.height.app/T-26391 - export in CSV
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Service,
      Purpose,
      Status,
      Owners,
      Teams,
      'Connections Made To': value,
      ...rest
    }): DataFlowInput => ({
      value,
      type: Type,
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

  // Upload the data flows into Transcend dashboard
  const syncedDataFlows = await syncDataFlows(
    client,
    validatedDataFlowInputs,
    classifyService,
  );

  // Log errors
  if (!syncedDataFlows) {
    logger.error(
      colors.red(
        'Encountered error(s) syncing data flows from CSV, see logs above for more info. ',
      ),
    );
    process.exit(1);
  }
}
