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
          countrySubDivision
          country
        }
        transferRegions {
          countrySubDivision
          country
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
          title
        }
        dataSubjects {
          type
        }
        teams {
          name
        }
        owners {
          email
        }
        processingPurposeSubCategories {
          name
          purpose
        }
        dataSubCategories {
          name
          category
        }
        saaSCategories {
          title
        }
      }
    }
  }
`;

// TODO: https://linear.app/transcend/issue/ZEL-6419 - support create and update mutations
