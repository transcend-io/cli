import type { GraphQLClient } from 'graphql-request';
import {
  ConsentManagerMetric,
  ConsentManagerMetricBin,
  fetchConsentManagerAnalyticsData,
  fetchConsentManagerId,
} from '../graphql';

/**
 * One second of time in ms
 */
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

/**
 * Pull consent manager metrics in an organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns The consent manager metrics
 */
export async function pullConsentManagerMetrics(
  client: GraphQLClient,
  {
    bin,
    start,
    end = new Date(),
  }: {
    /** Start date to pull metrics from */
    start: Date;
    /** End date to pull metrics from (assumes now) */
    end?: Date;
    /** Bin size to pull metrics */
    bin: ConsentManagerMetricBin;
  },
): Promise<{
  /** Privacy signal data */
  PRIVACY_SIGNAL_TIMESERIES: ConsentManagerMetric[];
  /** Consent changes data */
  CONSENT_CHANGES_TIMESERIES: ConsentManagerMetric[];
  /** Consent sessions by regime */
  CONSENT_SESSIONS_BY_REGIME: ConsentManagerMetric[];
}> {
  // Grab the bundleId associated with this API key
  const airgapBundleId = await fetchConsentManagerId(client);

  // convert start and end to times
  const startTime = Math.floor(start.getTime() / 1000);
  const endTime = Math.floor(end.getTime() / 1000);
  if (startTime > endTime) {
    throw new Error('Received "end" date that happened before "start" date');
  }

  // do not allow hourly bins greater than 2 weeks
  if (bin === '1h' && end.getTime() - start.getTime() > ONE_WEEK * 2) {
    throw new Error(
      'When using bin=1h, start and end time can be no more than 2 weeks apart',
    );
  }

  // Pull in the metrics
  const startDate = start.toISOString();
  const endDate = end.toISOString();
  const [privacySignalData, consentChangesData, consentSessionsByRegimeData] =
    await Promise.all([
      fetchConsentManagerAnalyticsData(client, {
        dataSource: 'PRIVACY_SIGNAL_TIMESERIES',
        startDate,
        endDate,
        forceRefetch: true,
        airgapBundleId,
        binInterval: bin,
        smoothTimeseries: false,
      }),
      fetchConsentManagerAnalyticsData(client, {
        dataSource: 'CONSENT_CHANGES_TIMESERIES',
        startDate,
        endDate,
        forceRefetch: true,
        airgapBundleId,
        binInterval: bin,
        smoothTimeseries: false,
      }),
      fetchConsentManagerAnalyticsData(client, {
        dataSource: 'CONSENT_SESSIONS_BY_REGIME',
        startDate,
        endDate,
        forceRefetch: true,
        airgapBundleId,
        binInterval: bin,
        smoothTimeseries: false,
      }),
    ]);

  return {
    PRIVACY_SIGNAL_TIMESERIES: privacySignalData,
    CONSENT_CHANGES_TIMESERIES: consentChangesData,
    CONSENT_SESSIONS_BY_REGIME: consentSessionsByRegimeData,
  };
}
