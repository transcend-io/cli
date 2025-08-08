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

export const CREATE_PROCESSING_ACTIVITY = gql`
  mutation TranscendCliCreateProcessingActivity(
    $input: CreateProcessingActivityInput!
  ) {
    createProcessingActivity(input: $input) {
      processingActivity {
        id
        title
      }
    }
  }
`;

export const UPDATE_PROCESSING_ACTIVITIES = gql`
  mutation TranscendCliUpdateProcessingActivities(
    $input: UpdateProcessingActivitiesInput!
  ) {
    updateProcessingActivities(input: $input) {
      clientMutationId
    }
  }
`;
