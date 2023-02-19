import { GraphQLClient } from 'graphql-request';
import colors from 'colors';
import { REQUESTS } from './gqls';
import cliProgress from 'cli-progress';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  RequestAction,
  RequestStatus,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';
import { logger } from '../logger';
import { LanguageKey } from '@transcend-io/internationalization';

export interface PrivacyRequest {
  /** ID of request */
  id: string;
  /** Time request was made */
  createdAt: string;
  /** Email of request */
  email: string;
  /** Link for request */
  link: string;
  /** Whether request is in test mode */
  isTest: boolean;
  /** Request details */
  details: string;
  /** Locale of request */
  locale: LanguageKey;
  /** Whether request is in silent mode */
  isSilent: boolean;
  /** Core identifier of request */
  coreIdentifier: string;
  /** Type of request action */
  type: RequestAction;
  /** STatus of request action */
  status: RequestStatus;
  /** Type of data subject */
  subjectType: string;
  /** Country of request */
  country?: IsoCountryCode | null;
  /** Sub division of request */
  countrySubDivision?: IsoCountrySubdivisionCode | null;
  /** Attribute values */
  attributeValues: {
    /** ID of value */
    id: string;
    /** Name of value */
    name: string;
    /** Attribute key */
    attributeKey: {
      /** ID of key */
      id: string;
      /** Name of key */
      name: string;
    };
  }[];
}

const PAGE_SIZE = 50;

/**
 * Fetch all requests matching a set of filters
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of requests
 */
export async function fetchAllRequests(
  client: GraphQLClient,
  {
    actions,
    statuses,
  }: {
    /** Actions to filter on */
    actions: RequestAction[];
    /** Statuses to filter on */
    statuses: RequestStatus[];
  },
): Promise<PrivacyRequest[]> {
  // create a new progress bar instance and use shades_classic theme
  const t0 = new Date().getTime();
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // read in requests
  const requests: PrivacyRequest[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      requests: { nodes, totalCount },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest(client, REQUESTS, {
      first: PAGE_SIZE,
      offset,
      actions,
      statuses,
    });
    if (offset === 0 && totalCount > PAGE_SIZE) {
      logger.info(colors.magenta(`Fetching ${totalCount} requests`));
      progressBar.start(totalCount, 0);
    }

    requests.push(...nodes);
    offset += PAGE_SIZE;
    progressBar.update(offset);
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  // Log completion time
  logger.info(
    colors.green(
      `Completed fetching of ${requests.length} request in "${
        totalTime / 1000
      }" seconds.`,
    ),
  );

  return requests;
}
