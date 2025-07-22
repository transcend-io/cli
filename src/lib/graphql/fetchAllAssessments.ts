import {
  AssessmentFormStatus,
  AssessmentQuestionSubType,
  AssessmentQuestionType,
  AssessmentSyncColumn,
  AssessmentSyncModel,
  AttributeSupportedResourceType,
  DataCategoryType,
  ProcessingPurpose,
  RetentionScheduleOperation,
  RetentionScheduleType,
} from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import { ASSESSMENTS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Represents an assessment with various properties and metadata.
 */
export interface Assessment {
  /** The ID of the assessment */
  id: string;
  /** The user who created the assessment */
  creator: UserPreview;
  /** The user who last edited the assessment */
  lastEditor: UserPreview;
  /** The title of the assessment */
  title: string;
  /** The description of the assessment */
  description: string;
  /** The current status of the assessment */
  status: AssessmentFormStatus;
  /** The users assigned to the assessment */
  assignees: UserPreview[];
  /** The external users assigned to the assessment */
  externalAssignees: ExternalUser[];
  /** The users who are reviewers of the assessment */
  reviewers: UserPreview[];
  /** Indicates if the assessment is locked */
  isLocked: boolean;
  /** Indicates if the assessment is archived */
  isArchived: boolean;
  /** Indicates if the assessment was created externally */
  isExternallyCreated: boolean;
  /** The due date of the assessment */
  dueDate: string;
  /** The date when the assessment was created */
  createdAt: string;
  /** The date when the assessment was last updated */
  updatedAt: string;
  /** The date when the assessment was assigned */
  assignedAt: string;
  /** The date when the assessment was submitted */
  submittedAt: string;
  /** The date when the assessment was approved */
  approvedAt: string;
  /** The date when the assessment was rejected */
  rejectedAt: string;
  /** Indicates if the title of the assessment is internal */
  titleIsInternal: boolean;
  /** The retention schedule of the assessment */
  retentionSchedule?: RetentionSchedule;
  /** The attribute values associated with the assessment */
  attributeValues: AttributeValue[];
  /** The sections of the assessment */
  sections: AssessmentSection[];
  /** The group to which the assessment belongs */
  assessmentGroup: AssessmentGroup;
  /** The resources associated with the assessment */
  resources: AssessmentResource[];
  /** The rows that are synced with the assessment */
  syncedRows: AssessmentResource[];
}

export interface UserPreview {
  /** ID of user */
  id: string;
  /** Email of user */
  email: string;
  /** Name of user */
  name: string;
}

export interface ExternalUser {
  /** ID of external user */
  id: string;
  /** Email of external user */
  email: string;
}

export interface RetentionSchedule {
  /** ID of retention schedule */
  id: string;
  /** Type */
  type: RetentionScheduleType;
  /** Duration of retention schedule */
  durationDays: number;
  /** The operation to perform on the retention schedule */
  operation: RetentionScheduleOperation;
}

interface AttributeValue {
  /** Name of attribute value */
  name: string;
  /** Key */
  attributeKey: {
    /** Name of key */
    name: string;
  };
}

export interface AssessmentSection {
  /** ID of section */
  id: string;
  /** Title of section */
  title: string;
  /** Status of section */
  status: string;
  /** Index of section */
  index: number;
  /** Questions */
  questions: AssessmentQuestion[];
  /** Assignees */
  assignees: UserPreview[];
  /** External assignees */
  externalAssignees: ExternalUser[];
  /** Whether is reviewed */
  isReviewed: boolean;
}

/**
 * Represents a question in the assessment.
 */
export interface AssessmentQuestion {
  /**
   * Unique identifier for the question.
   */
  id: string;
  /** Title of the question */
  title: string;
  /** Index of the question in the assessment */
  index: number;
  /** Type of the question */
  type: AssessmentQuestionType;
  /** Subtype of the question */
  subType: AssessmentQuestionSubType;
  /** Placeholder text for the question */
  placeholder: string;
  /** Description of the question */
  description: string;
  /** Indicates if the question is required */
  isRequired: boolean;
  /** Logic for displaying the question */
  displayLogic: string;
  /** Logic for assessing risk related to the question */
  riskLogic: string[];
  /** Indicates if risk evaluation is required for the question */
  requireRiskEvaluation: boolean;
  /** Indicates if risk matrix evaluation is required for the question */
  requireRiskMatrixEvaluation: boolean;
  /** Categories of risk associated with the question */
  riskCategories: RiskCategory[];
  /** Framework used for risk assessment */
  riskFramework?: RiskFramework;
  /** Level of risk associated with the question */
  riskLevel?: RiskLevel;
  /** Risk level assigned by the reviewer */
  reviewerRiskLevel?: RiskLevel;
  /** Risk level derived from the risk matrix */
  riskLevelFromRiskMatrix?: RiskLevel;
  /** Options available for answering the question */
  answerOptions: AssessmentAnswerOption[];
  /** Answers selected for the question */
  selectedAnswers: AssessmentAnswer[];
  /** User who responded to the question */
  respondent: UserPreview;
  /** Key attribute associated with the question */
  attributeKey?: {
    /** Name of key */
    name: string;
  };
  /** Email of the external respondent */
  externalRespondentEmail?: string;
  /** Comments related to the question */
  comments: unknown[];
  /** Allowed MIME types for file uploads in the question */
  allowedMimeTypes: string[];
  /** Timestamp of the last update to the question */
  updatedAt: string;
  /** Reference identifier for the question */
  referenceId: string;
  /** Previous submissions related to the question */
  previousSubmissions: AssessmentPreviousSubmission[];
  /** Indicates if selecting "Other" is allowed for the question */
  allowSelectOther: boolean;
  /** Model used for synchronization */
  syncModel: AssessmentSyncModel;
  /** Column used for synchronization */
  syncColumn: AssessmentSyncColumn;
  /** Row IDs used for synchronization */
  syncRowIds: string[];
  /** Indicates if synchronization override is allowed */
  syncOverride: boolean;
}

export interface RiskCategory {
  /** ID of category */
  id: string;
  /** Title of category */
  title: string;
}

export interface RiskFramework {
  /** ID of framework */
  id: string;
  /** Title of framework */
  title: string;
  /** Description of framework */
  description: string;
  /** Risk levels */
  riskLevels: RiskLevel[];
  /** Risk categories */
  riskCategories: RiskCategory[];
  /** Risk matrix columns */
  riskMatrixColumns: RiskMatrixColumn[];
  /** Risk matrix rows */
  riskMatrixRows: RiskMatrixRow[];
  /** Risk matrix settings */
  riskMatrix: RiskMatrix[][];
  /** Creator of risk framework */
  creator?: UserPreview;
  /** Risk matrix row title */
  riskMatrixRowTitle: string;
  /** Risk matrix column title */
  riskMatrixColumnTitle: string;
}

export interface RiskLevel {
  /** ID of risk level */
  id: string;
  /** Title of risk level */
  title: string;
}

export interface RiskMatrix {
  /** ID of risk matrix */
  id: string;
  /** Title of risk matrix */
  title: string;
}

export interface RiskMatrixColumn {
  /** ID of column */
  id: string;
  /** Title of column */
  title: string;
}

export interface RiskMatrixRow {
  /** ID of row */
  id: string;
  /** Title of row */
  title: string;
}

export interface AssessmentAnswerOption {
  /** ID of answer option */
  id: string;
  /** Index of answer option */
  index: number;
  /** Value of answer */
  value: string;
}

export interface AssessmentAnswer {
  /** ID of answer */
  id: string;
  /** Index of answer */
  index: number;
  /** Value of answer */
  value: string;
}

export interface AssessmentComment {
  /** ID of comment */
  id: string;
  /** Content of comment */
  content: string;
  /** Date comment made */
  createdAt: string;
  /** Date comment updated */
  updatedAt: string;
  /** Author of comment */
  author?: UserPreview;
}

export interface AssessmentPreviousSubmission {
  /** Id of submission */
  id: string;
  /** Date updated */
  updatedAt: string;
  /** ID of question */
  assessmentQuestionId: string;
  /** Answers */
  answers: AssessmentAnswer[];
}

export interface AssessmentGroup {
  /** ID of group */
  id: string;
  /** Title of group */
  title: string;
  /** Description of group */
  description: string;
}

export interface AssessmentResource {
  /** Type of resource */
  resourceType: AttributeSupportedResourceType;
  /** ID of resource */
  id: string;
  /** Title of resource */
  title?: string;
  /** Name of resource */
  name?: string;
  /** Category of resource */
  category?: DataCategoryType;
  /** Purpose of resource */
  purpose?: ProcessingPurpose;
  /** Type of integration */
  type?: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all assessments in the organization
 *
 * @param client - GraphQL client
 * @returns All assessments in the organization
 */
export async function fetchAllAssessments(
  client: GraphQLClient,
): Promise<Assessment[]> {
  const assessments: Assessment[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      assessmentForms: { nodes },
    } = await makeGraphQLRequest<{
      /** Forms */
      assessmentForms: {
        /** Nodes */
        nodes: Assessment[];
      };
    }>(client, ASSESSMENTS, {
      first: PAGE_SIZE,
      offset,
    });
    assessments.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return assessments.sort((a, b) => a.title.localeCompare(b.title));
}
