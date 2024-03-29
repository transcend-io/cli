import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// TODO: https://transcend.height.app/T-27909 - order by createdAt
// orderBy: [{ field: title, direction: ASC }]
export const ASSESSMENTS = gql`
  query TranscendCliAssessments(
    $first: Int!
    $offset: Int!
    $filterBy: AssessmentFiltersInput
  ) {
    assessments(
      first: $first
      useMaster: false
      offset: $offset
      filterBy: $filterBy
    ) {
      nodes {
        id
        title
        status
        assessmentTemplate {
          title
        }
        content
        resources {
          resourceType
        }
      }
    }
  }
`;

export const UPDATE_ASSESSMENT = gql`
  mutation TranscendCliUpdateAssessment($input: UpdateAssessmentInput!) {
    updateAssessment(input: $input) {
      clientMutationId
    }
  }
`;

export const CREATE_ASSESSMENT = gql`
  mutation TranscendCliCreateAssessment($input: CreateAssessmentInput!) {
    createAssessment(input: $input) {
      clientMutationId
      assessment {
        id
      }
    }
  }
`;

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// TODO: https://transcend.height.app/T-27909 - order by createdAt
// orderBy: [{ field: title, direction: ASC }]
export const ASSESSMENT_TEMPLATES = gql`
  query TranscendCliAssessmentTemplates($first: Int!, $offset: Int!) {
    assessmentTemplates(first: $first, useMaster: false, offset: $offset) {
      nodes {
        id
        title
        content
        attributeKeys {
          name
        }
      }
    }
  }
`;

export const UPDATE_ASSESSMENT_TEMPLATE = gql`
  mutation TranscendCliUpdateAssessmentTemplate(
    $input: UpdateAssessmentTemplateInput!
  ) {
    updateAssessmentTemplate(input: $input) {
      clientMutationId
    }
  }
`;

export const CREATE_ASSESSMENT_TEMPLATE = gql`
  mutation TranscendCliCreateAssessmentTemplate(
    $input: CreateAssessmentTemplateInput!
  ) {
    createAssessmentTemplate(input: $input) {
      clientMutationId
    }
  }
`;
