import { gql } from 'graphql-request';
import { ASSESSMENT_SECTION_FIELDS } from './assessment';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
// orderBy: [
//   { field: createdAt, direction: ASC }
//   { field: name, direction: ASC }
// ]
export const ASSESSMENT_TEMPLATES = gql`
  query TranscendCliAssessmentTemplates(
    $first: Int!
    $offset: Int!
    $filterBy: AssessmentFormTemplateFiltersInput
  ) {
    assessmentFormTemplates(
      first: $first
      offset: $offset
      filterBy: $filterBy
    ) {
      nodes {
        id
        creator {
          id
          email
          name
        }
        lastEditor {
          id
          email
          name
        }
        title
        description
        status
        source
        parentId
        isLocked
        isArchived
        createdAt
        updatedAt
        retentionSchedule {
          id
          type
          durationDays
          operation
          createdAt
          updatedAt
        }
        assessmentEmailSet {
          id
          title
          description
          isDefault
          templates {
            id
            title
          }
        }
        sections {
          ${ASSESSMENT_SECTION_FIELDS}
        }
      }
    }
  }
`;
