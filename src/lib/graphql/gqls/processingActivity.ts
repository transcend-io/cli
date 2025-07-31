import { gql } from 'graphql-request';

export const PROCESSING_ACTIVITIES = gql`
  query TranscendCliProcessingActivities($first: Int!, $offset: Int!) {
    processingActivities(first: $first, offset: $offset, useMaster: false) {
      nodes {
        id
        title
        description
        securityMeasureDetails
        controllerships
        storageRegions {
          id
          name
        }
        transferRegions {
          id
          name
        }
        retentionType
        retentionPeriod
        dataProtectionImpactAssessmentLink
        dataProtectionImpactAssessmentStatus
        attributeValues {
          name
          attributeKey {
            name
          }
        }
        dataSilos {
          id
          title
        }
        dataSubjects {
          id
          title {
            defaultMessage
          }
        }
        teams {
          id
          name
        }
        owners {
          id
          email
        }
        processingPurposeSubCategories {
          id
          name
          purpose
        }
        dataSubCategories {
          id
          name
        }
        saaSCategories {
          id
          name
        }
      }
    }
  }
`;
