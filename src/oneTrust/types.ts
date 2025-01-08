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
  resultName: string;
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
  /** Attribute for which the option is available. */
  attributes: string;
  /** ID of the option. */
  id: string;
  /** Name of the option. */
  option: string;
  /** Type of option. */
  optionType: 'NOT_SURE' | 'NOT_APPLICABLE' | 'OTHERS' | 'DEFAULT';
  /** Order in which the option appears. */
  sequence: number;
}

interface OneTrustAssessmentQuestionRisks {
  /** Level of risk flagged on the question. */
  level: number;
  /** ID of the question for which the risk was flagged. */
  questionId: string;
  /** ID of the flagged risk. */
  riskId: string;
}

interface OneTrustAssessmentQuestionResponses {
  /** Justification comments for the given response. */
  justification: string;
  /** The responses */
  responses: {
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
    /** The data subject */
    dataSubject: {
      /** The ID of the data subject */
      id: string;
      /** The ID of the data subject */
      name: string;
    };
    /** Error associated with the response. */
    errorCode:
      | 'ATTRIBUTE_DISABLED'
      | 'ATTRIBUTE_OPTION_DISABLED'
      | 'INVENTORY_NOT_EXISTS'
      | 'RELATED_INVENTORY_ATTRIBUTE_DISABLED'
      | 'DATA_ELEMENT_NOT_EXISTS'
      | 'DUPLICATE_INVENTORY';
    /** Content of the response. */
    response: string;
    /** ID of the response. */
    responseId: string;
    /** This parameter is only applicable for inventory type responses (Example- ASSETS). */
    responseMap: object;
    /** Source from which the assessment is launched. */
    responseSourceType: 'LAUNCH_FROM_INVENTORY';
    /** Type of response. */
    type:
      | 'NOT_SURE'
      | 'JUSTIFICATION'
      | 'NOT_APPLICABLE'
      | 'DEFAULT'
      | 'OTHERS';
    /** Indicates whether the response is valid. */
    valid: boolean;
  }[];
}

interface OneTrustAssessmentQuestion {
  /** IDs of the attachment(s) added to the question. */
  attachmentIds: string[];
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: boolean;
  /** Indicates whether the question is hidden on the assessment. */
  hidden: boolean;
  /** Reason for locking the question in the assessment. */
  lockReason: 'LAUNCH_FROM_INVENTORY';
  /** The question */
  question: {
    /** Data element attributes that are directly updated by the question. */
    attributes: string;
    /** The text of a question. */
    content: string;
    /** Description of the question. */
    description: string;
    /** Short, descriptive name for the question. */
    friendlyName: string;
    /** Tooltip text within a hint for the question. */
    hint: string;
    /** ID of the question. */
    id: string;
    /** Indicates whether the assessment is linked to inventory records. */
    linkAssessmentToInventory: boolean;
    /** The question options */
    options: OneTrustAssessmentQuestionOption[];
    /** ID of the parent question. */
    parentQuestionId: string;
    /** Indicates whether the response to the question is prepopulated. */
    prePopulateResponse: boolean;
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
    /** Indicates whether justification comments are required for the question. */
    requireJustification: boolean;
    /** Indicates whether a response to the question is required. */
    required: boolean;
    /** ID of the root version of the question. */
    rootVersionId: string;
    /** Order in which the question appears in the assessment. */
    sequence: number;
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
    /** Indicates whether the question is valid. */
    valid: boolean;
  };
  /** The responses to this question */
  questionResponses: OneTrustAssessmentQuestionResponses[];
  /** The risks associated with this question */
  risks: OneTrustAssessmentQuestionRisks[];
  /** List of IDs associated with the question root requests. */
  rootRequestInformationIds: string[];
  /** Number of attachments added to the question. */
  totalAttachments: number;
}

interface OneTrustAssessmentSection {
  /** Descriptions of the section. */
  description: string;
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: boolean;
  /** The Assessment section header */
  header: {
    /** Description of the section header. */
    description: string;
    /** Indicates whether the section is hidden in the assessment. */
    hidden: boolean;
    /** Number of invalid questions in the section. */
    invalidQuestionCount: number;
    /** IDs of invalid questions in the section. */
    invalidQuestionIds: string[];
    /** Name of the section. */
    name: string;
    /** IDs of required questions in the section. */
    requiredQuestionIds: string[];
    /** IDs of required but unanswered questions in the section. */
    requiredUnansweredQuestionIds: string[];
    /** The risk statistics */
    riskStatistics: {
      /** Maximum level of risk in the section. */
      maxRiskLevel: number;
      /** Number of risks in the section. */
      riskCount: number;
      /** ID of the section in the assessment. */
      sectionId: string;
    };
    /** ID of the section in the assessment. */
    sectionId: string;
    /** IDs of unanswered questions in the section. */
    unansweredQuestionIds: string[];
  };
  /** Indicates whether navigation rules are enabled for the question. */
  hidden: boolean;
  /** Name of the section. */
  name: string;
  /** The questions within the section */
  questions: OneTrustAssessmentQuestion[];
  /** ID of the section in an assessment. */
  sectionId: string;
  /** Indicates whether the section is valid. */
  valid: boolean;
}

interface OneTrustApprover {
  /** Assessment approval status. */
  approvalState: 'OPEN' | 'APPROVED' | 'REJECTED';
  /** Date and time at which the assessment was approved. */
  approvedOn: string;
  /** ID of the user assigned as an approver. */
  id: string;
  /** Name of the user assigned as an approver. */
  name: string;
  /** ID of the assessment result. */
  resultId: string;
  /** Name of the assessment result. */
  resultName: string;
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
  completedOn: string;
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
  deadline: string;
  /** Description of the assessment. */
  description: string;
  /** Number of risks captured on the assessment with a high risk level. */
  highRisk: number;
  /** Overall inherent risk score without considering the existing controls. */
  inherentRiskScore: number;
  /** Date and time at which the assessment was last updated. */
  lastUpdated: string;
  /** Number of risks captured on the assessment with a low risk level. */
  lowRisk: number;
  /** Number of risks captured on the assessment with a medium risk level. */
  mediumRisk: number;
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
    /** Name and number of the primary record. */
    displayName: string;
    /** Unique ID for the primary record. */
    id: string;
    /** Name of the primary record. */
    name: string;
    /** The number associated with the primary record. */
    number: number;
  }[];
  /** Type of inventory record designated as the primary record. */
  primaryRecordType:
    | 'ASSETS'
    | 'PROCESSING_ACTIVITY'
    | 'VENDORS'
    | 'ENTITIES'
    | 'ASSESS_CONTROL'
    | 'ENGAGEMENT';
  /** Overall risk score after considering existing controls. */
  residualRiskScore: number;
  /** The respondent */
  respondent: {
    /** The ID of the respondent */
    id: string;
    /** The name of the respondent */
    name: string;
  };
  /** The respondents */
  respondents: {
    /** The ID of the respondent */
    id: string;
    /** The name of the respondent */
    name: string;
  }[];
  /** Result of the assessment. */
  result: string;
  /** ID of the result. */
  resultId: string;
  /** Name of the result. */
  resultName: string;
  /** Risk level of the assessment. */
  riskLevel: string;
  /** List of sections in the assessment. */
  sections: OneTrustAssessmentSection[];
  /** Status of the assessment. */
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED';
  /** Date and time at which the assessment was submitted. */
  submittedOn: string;
  /** List of tags associated with the assessment. */
  tags: string[];
  /** The desired target risk score. */
  targetRiskScore: number;
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
  welcomeText: string;
}
/* eslint-enable max-lines */
