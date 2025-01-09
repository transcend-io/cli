/* eslint-disable max-lines */
export interface OneTrustAssessment {
  /** ID of the assessment. */
  assessmentId: string;
  /** Date that the assessment was created. */
  createDt: string;
  /** Overall risk score without considering existing controls. */
  inherentRiskScore: number;
  /** Date and time that the assessment was last updated. */
  lastUpdated: string;
  /** Name of the assessment. */
  name: string;
  /** Number assigned to the assessment. */
  number: number;
  /** Number of risks that are open on the assessment. */
  openRiskCount: number;
  /** Name of the organization group assigned to the assessment. */
  orgGroupName: string;
  /** Details about the inventory record which is the primary record of the assessment. */
  primaryInventoryDetails: {
    /** GUID of the inventory record. */
    primaryInventoryId: string;
    /** Name of the inventory record. */
    primaryInventoryName: string;
    /** Integer ID of the inventory record. */
    primaryInventoryNumber: number;
  };
  /** Overall risk score after considering existing controls. */
  residualRiskScore: number;
  /** Result of the assessment. NOTE: This field will be deprecated soon. Please reference the 'resultName' field instead. */
  result: 'Approved' | 'AutoClosed' | 'Rejected';
  /** ID of the result. */
  resultId: string;
  /** Name of the result. */
  resultName:
    | 'Approved - Remediation required'
    | 'Approved'
    | 'Rejected'
    | 'Assessment suspended - On Hold'
    | null;
  /** State of the assessment. */
  state: 'ARCHIVE' | 'ACTIVE';
  /** Status of the assessment. */
  status: 'Not Started' | 'In Progress' | 'Under Review' | 'Completed';
  /** Name of the tag attached to the assessment. */
  tags: string[];
  /** The desired risk score. */
  targetRiskScore: number;
  /** ID used to launch an assessment using a specific version of a template. */
  templateId: string;
  /**  Name of the template that is being used on the assessment. */
  templateName: string;
  /** ID used to launch an assessment using the latest published version of a template. */
  templateRootVersionId: string;
}

// ref: https://developer.onetrust.com/onetrust/reference/getallassessmentbasicdetailsusingget
export interface OneTrustGetListOfAssessmentsResponse {
  /** The list of assessments in the current page. */
  content?: OneTrustAssessment[];
  /** Details about the pages being fetched */
  page?: {
    /** Page number of the results list (0…N). */
    number: number;
    /** Number of records per page (0…N). */
    size: number;
    /** Total number of elements. */
    totalElements: number;
    /** Total number of pages. */
    totalPages: number;
  };
}

interface OneTrustAssessmentQuestionOption {
  /** ID of the option. */
  id: string;
  /** Name of the option. */
  option: string;
  /** Order in which the option appears. */
  sequence: number;
  /** Attribute for which the option is available. */
  attributes: string | null;
  /** Type of option. */
  optionType: 'NOT_SURE' | 'NOT_APPLICABLE' | 'OTHERS' | 'DEFAULT';
}

interface OneTrustAssessmentQuestionRisks {
  /** ID of the question for which the risk was flagged. */
  questionId: string;
  /** ID of the flagged risk. */
  riskId: string;
  /** Level of risk flagged on the question. */
  level: number;
  /** Score of risk flagged on the question. */
  score: number;
  /** Probability of risk flagged on the question. */
  probability?: number;
  /** Impact Level of risk flagged on the question. */
  impactLevel?: number;
}

interface OneTrustAssessmentQuestionResponses {
  /** The responses */
  responses: {
    /** ID of the response. */
    responseId: string;
    /** Content of the response. */
    response: string;
    /** Type of response. */
    type:
      | 'NOT_SURE'
      | 'JUSTIFICATION'
      | 'NOT_APPLICABLE'
      | 'DEFAULT'
      | 'OTHERS';
    /** Source from which the assessment is launched. */
    responseSourceType: 'LAUNCH_FROM_INVENTORY' | 'FORCE_CREATED_SOURCE' | null;
    /** Error associated with the response. */
    errorCode:
      | 'ATTRIBUTE_DISABLED'
      | 'ATTRIBUTE_OPTION_DISABLED'
      | 'INVENTORY_NOT_EXISTS'
      | 'RELATED_INVENTORY_ATTRIBUTE_DISABLED'
      | 'DATA_ELEMENT_NOT_EXISTS'
      | 'DUPLICATE_INVENTORY'
      | null;
    /** This parameter is only applicable for inventory type responses (Example- ASSETS). */
    responseMap: object;
    /** Indicates whether the response is valid. */
    valid: boolean;
    /** The data subject */
    dataSubject: {
      /** The ID of the data subject */
      id: string;
      /** The ID of the data subject */
      name: string;
    };
    /** The data category */
    dataCategory: {
      /** The ID of the data category */
      id: string;
      /** The name of the data category */
      name: string;
    };
    /** The data element */
    dataElement: {
      /** The ID of the data element */
      id: string;
      /** The ID of the data element */
      name: string;
    };
  }[];
  /** Justification comments for the given response. */
  justification: string | null;
}

export interface OneTrustAssessmentQuestion {
  /** The question */
  question: {
    /** ID of the question. */
    id: string;
    /** ID of the root version of the question. */
    rootVersionId: string;
    /** Order in which the question appears in the assessment. */
    sequence: number;
    /** Type of question in the assessment. */
    questionType:
      | 'TEXTBOX'
      | 'MULTICHOICE'
      | 'YESNO'
      | 'DATE'
      | 'STATEMENT'
      | 'INVENTORY'
      | 'ATTRIBUTE'
      | 'PERSONAL_DATA';
    /** Indicates whether a response to the question is required. */
    required: boolean;
    /** Data element attributes that are directly updated by the question. */
    attributes: string;
    /** Short, descriptive name for the question. */
    friendlyName: string | null;
    /** Description of the question. */
    description: string | null;
    /** Tooltip text within a hint for the question. */
    hint: string;
    /** ID of the parent question. */
    parentQuestionId: string;
    /** Indicates whether the response to the question is prepopulated. */
    prePopulateResponse: boolean;
    /** Indicates whether the assessment is linked to inventory records. */
    linkAssessmentToInventory: boolean;
    /** The question options */
    options: OneTrustAssessmentQuestionOption[] | null;
    /** Indicates whether the question is valid. */
    valid: boolean;
    /** Type of question in the assessment. */
    type:
      | 'TEXTBOX'
      | 'MULTICHOICE'
      | 'YESNO'
      | 'DATE'
      | 'STATEMENT'
      | 'INVENTORY'
      | 'ATTRIBUTE'
      | 'PERSONAL_DATA';
    /** Whether the response can be multi select */
    allowMultiSelect: boolean;
    /** The text of a question. */
    content: string;
    /** Indicates whether justification comments are required for the question. */
    requireJustification: boolean;
  };
  /** Indicates whether the question is hidden on the assessment. */
  hidden: boolean;
  /** Reason for locking the question in the assessment. */
  lockReason: 'LAUNCH_FROM_INVENTORY' | 'FORCE_CREATION_LOCK' | null;
  /** The copy errors */
  copyErrors: string | null;
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: boolean;
  /** The responses to this question */
  questionResponses: OneTrustAssessmentQuestionResponses[];
  /** The risks associated with this question */
  risks: OneTrustAssessmentQuestionRisks[] | null;
  /** List of IDs associated with the question root requests. */
  rootRequestInformationIds: string[];
  /** Number of attachments added to the question. */
  totalAttachments: number;
  /** IDs of the attachment(s) added to the question. */
  attachmentIds: string[];
}

export interface OneTrustAssessmentSection {
  /** The Assessment section header */
  header: {
    /** ID of the section in the assessment. */
    sectionId: string;
    /** Name of the section. */
    name: string;
    /** Description of the section header. */
    description: string | null;
    /** Sequence of the section within the form */
    sequence: number;
    /** Indicates whether the section is hidden in the assessment. */
    hidden: boolean;
    /** IDs of invalid questions in the section. */
    invalidQuestionIds: string[];
    /** IDs of required but unanswered questions in the section. */
    requiredUnansweredQuestionIds: string[];
    /** IDs of required questions in the section. */
    requiredQuestionIds: string[];
    /** IDs of unanswered questions in the section. */
    unansweredQuestionIds: string[];
    /** IDs of effectiveness questions in the section. */
    effectivenessQuestionIds: string[];
    /** Number of invalid questions in the section. */
    invalidQuestionCount: number;
    /** The risk statistics */
    riskStatistics: null | {
      /** Maximum level of risk in the section. */
      maxRiskLevel: number;
      /** Number of risks in the section. */
      riskCount: number;
      /** ID of the section in the assessment. */
      sectionId: string;
    };
    /** Whether the section was submitted */
    submitted: boolean;
  };
  /** The questions within the section */
  questions: OneTrustAssessmentQuestion[];
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: boolean;
  /** Who submitted the section */
  submittedBy: null | {
    /** The ID of the user who submitted the section */
    id: string;
    /** THe name or email of the user who submitted the section */
    name: string;
  };
  /** Date of the submission */
  submittedDt: string | null;
  /** Name of the section. */
  name: string;
  /** Indicates whether navigation rules are enabled for the question. */
  hidden: boolean;
  /** Indicates whether the section is valid. */
  valid: boolean;
  /** ID of the section in an assessment. */
  sectionId: string;
  /** Sequence of the section within the form */
  sequence: number;
  /** Whether the section was submitted */
  submitted: boolean;
  /** Descriptions of the section. */
  description: string | null;
}

export interface OneTrustApprover {
  /** ID of the user assigned as an approver. */
  id: string;
  /** ID of the workflow stage */
  workflowStageId: string;
  /** Name of the user assigned as an approver. */
  name: string;
  /** More details about the approver */
  approver: {
    /** ID of the user assigned as an approver. */
    id: string;
    /** Full name of the user assigned as an approver. */
    fullName: string;
    /** Email of the user assigned as an approver. */
    email: string | null;
    /** Whether the user assigned as an approver was deleted. */
    deleted: boolean;
  };
  /** Assessment approval status. */
  approvalState: 'OPEN' | 'APPROVED' | 'REJECTED';
  /** Date and time at which the assessment was approved. */
  approvedOn: string;
  /** ID of the assessment result. */
  resultId: string;
  /** Name of the assessment result. */
  resultName:
    | 'Approved - Remediation required'
    | 'Approved'
    | 'Rejected'
    | 'Assessment suspended - On Hold'
    | null;
  /** Name key of the assessment result. */
  resultNameKey: string;
}

// ref: https://developer.onetrust.com/onetrust/reference/exportassessmentusingget
export interface OneTrustGetAssessmentResponse {
  /** List of users assigned as approvers of the assessment. */
  approvers: OneTrustApprover[];
  /** ID of an assessment. */
  assessmentId: string;
  /** Number assigned to an assessment. */
  assessmentNumber: number;
  /** Date and time at which the assessment was completed. */
  completedOn: string | null;
  /** Creator of the Assessment */
  createdBy: {
    /** The ID of the creator */
    id: string;
    /** The name of the creator */
    name: string;
  };
  /** Date and time at which the assessment was created. */
  createdDT: string;
  /** Date and time by which the assessment must be completed. */
  deadline: string | null;
  /** Description of the assessment. */
  description: string | null;
  /** Overall inherent risk score without considering the existing controls. */
  inherentRiskScore: number | null;
  /** Date and time at which the assessment was last updated. */
  lastUpdated: string;
  /** Number of risks captured on the assessment with a low risk level. */
  lowRisk: number;
  /** Number of risks captured on the assessment with a medium risk level. */
  mediumRisk: number;
  /** Number of risks captured on the assessment with a high risk level. */
  highRisk: number;
  /** Name of the assessment. */
  name: string;
  /** Number of open risks that have not been addressed. */
  openRiskCount: number;
  /** The organization group */
  orgGroup: {
    /** The ID of the organization group */
    id: string;
    /** The name of the organization group */
    name: string;
  };
  /** The primary record */
  primaryEntityDetails: {
    /** Unique ID for the primary record. */
    id: string;
    /** Name of the primary record. */
    name: string;
    /** The number associated with the primary record. */
    number: number;
    /** Name and number of the primary record. */
    displayName: string;
  }[];
  /** Type of inventory record designated as the primary record. */
  primaryRecordType:
    | 'ASSETS'
    | 'PROCESSING_ACTIVITY'
    | 'VENDORS'
    | 'ENTITIES'
    | 'ASSESS_CONTROL'
    | 'ENGAGEMENT'
    | null;
  /** Overall risk score after considering existing controls. */
  residualRiskScore: number | null;
  /** The respondent */
  respondent: {
    /** The ID of the respondent */
    id: string;
    /** The name or email of the respondent */
    name: string;
  };
  /** The respondents */
  respondents: {
    /** The ID of the respondent */
    id: string;
    /** The name or email of the respondent */
    name: string;
  }[];
  /** Result of the assessment. */
  result: string | null;
  /** ID of the result. */
  resultId: string | null;
  /** Name of the result. */
  resultName:
    | 'Approved - Remediation required'
    | 'Approved'
    | 'Rejected'
    | 'Assessment suspended - On Hold'
    | null;
  /** Risk level of the assessment. */
  riskLevel: 'None' | 'Low' | 'Medium' | 'High' | 'Very High';
  /** List of sections in the assessment. */
  sections: OneTrustAssessmentSection[];
  /** Status of the assessment. */
  status: 'Not Started' | 'In Progress' | 'Under Review' | 'Completed' | null;
  /** Date and time at which the assessment was submitted. */
  submittedOn: string | null;
  /** List of tags associated with the assessment. */
  tags: string[];
  /** The desired target risk score. */
  targetRiskScore: number | null;
  /** The template */
  template: {
    /** The ID of the template */
    id: string;
    /** The name of the template */
    name: string;
  };
  /** Number of total risks on the assessment. */
  totalRiskCount: number;
  /** Number of very high risks on the assessment. */
  veryHighRisk: number;
  /** Welcome text if any in the assessment. */
  welcomeText: string | null;
}
/* eslint-enable max-lines */
