import { gql } from 'graphql-request';

export const CONSENT_MANAGER_ANALYTICS_DATA = gql`
  query TranscendCliConsentManagerAnalyticsData($input: AnalyticsInput!) {
    analyticsData(input: $input) {
      series {
        name
        points {
          key
          value
        }
      }
    }
  }
`;
