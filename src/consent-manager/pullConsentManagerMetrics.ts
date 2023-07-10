import type { GraphQLClient } from 'graphql-request';
import {
  ConsentManagerMetric,
  ConsentManagerMetricBin,
  fetchConsentManagerAnalyticsData,
  fetchConsentManagerId,
} from '../graphql';

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
}> {
  // Grab the bundleId associated with this API key
  const airgapBundleId = await fetchConsentManagerId(client);

  // convert start and end to times
  const startTime = Math.floor(start.getTime() / 1000);
  const endTime = Math.floor(end.getTime() / 1000);
  if (startTime > endTime) {
    throw new Error('Received "end" date that happened before "start" date');
  }

  // Pull in the metrics
  const [privacySignalData, consentChangesData] = await Promise.all([
    fetchConsentManagerAnalyticsData(client, {
      dataSource: 'PRIVACY_SIGNAL_TIMESERIES',
      startDate: startTime,
      endDate: endTime,
      forceRefetch: true,
      airgapBundleId,
      binInterval: bin,
      smoothTimeseries: false,
    }),
    fetchConsentManagerAnalyticsData(client, {
      dataSource: 'CONSENT_CHANGES_TIMESERIES',
      startDate: startTime,
      endDate: endTime,
      forceRefetch: true,
      airgapBundleId,
      binInterval: bin,
      smoothTimeseries: false,
    }),
  ]);

  return {
    PRIVACY_SIGNAL_TIMESERIES: privacySignalData,
    CONSENT_CHANGES_TIMESERIES: consentChangesData,
  };
}
