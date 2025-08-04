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
          id
          title
        }
        dataSubjects {
          id
          type
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
          category
        }
        saaSCategories {
          id
          title
        }
      }
    }
  }
`;

// TODO: https://linear.app/transcend/issue/ZEL-6419 - support create and update mutations
