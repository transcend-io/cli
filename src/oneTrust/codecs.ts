/* eslint-disable max-lines */
import * as t from 'io-ts';

// TODO: move all to privacy-types

export const OneTrustAssessmentCodec = t.type({
  /** ID of the assessment. */
  assessmentId: t.string,
  /** Date that the assessment was created. */
  createDt: t.string,
  /** Overall risk score without considering existing controls. */
  inherentRiskScore: t.union([t.number, t.null]),
  /** Date and time that the assessment was last updated. */
  lastUpdated: t.string,
  /** Name of the assessment. */
  name: t.string,
  /** Number assigned to the assessment. */
  number: t.number,
  /** Number of risks that are open on the assessment. */
  openRiskCount: t.number,
  /** Name of the organization group assigned to the assessment. */
  orgGroupName: t.string,
  /** Details about the inventory record which is the primary record of the assessment. */
  primaryInventoryDetails: t.union([
    t.type({
      /** GUID of the inventory record. */
      primaryInventoryId: t.string,
      /** Name of the inventory record. */
      primaryInventoryName: t.string,
      /** Integer ID of the inventory record. */
      primaryInventoryNumber: t.number,
    }),
    t.null,
  ]),
  /** Overall risk score after considering existing controls. */
  residualRiskScore: t.union([t.number, t.null]),
  /** Result of the assessment. NOTE: This field will be deprecated soon. Please reference the 'resultName' field instead. */
  result: t.union([
    t.literal('Approved'),
    t.literal('AutoClosed'),
    t.literal('Rejected'),
    t.string,
    t.null,
  ]),
  /** ID of the result. */
  resultId: t.union([t.string, t.null]),
  /** Name of the result. */
  resultName: t.union([
    t.literal('Approved - Remediation required'),
    t.literal('Approved'),
    t.literal('Rejected'),
    t.literal('Assessment suspended - On Hold'),
    t.string,
    t.null,
  ]),
  /** State of the assessment. */
  state: t.union([t.literal('ARCHIVE'), t.literal('ACTIVE')]),
  /** Status of the assessment. */
  status: t.union([
    t.literal('Not Started'),
    t.literal('In Progress'),
    t.literal('Under Review'),
    t.literal('Completed'),
    t.null,
  ]),
  /** Name of the tag attached to the assessment. */
  tags: t.array(t.string),
  /** The desired risk score. */
  targetRiskScore: t.union([t.number, t.null]),
  /** ID used to launch an assessment using a specific version of a template. */
  templateId: t.string,
  /**  Name of the template that is being used on the assessment. */
  templateName: t.string,
  /** ID used to launch an assessment using the latest published version of a template. */
  templateRootVersionId: t.string,
});

/** Type override */
export type OneTrustAssessmentCodec = t.TypeOf<typeof OneTrustAssessmentCodec>;

// ref: https://developer.onetrust.com/onetrust/reference/getallassessmentbasicdetailsusingget
export const OneTrustGetListOfAssessmentsResponseCodec = t.partial({
  /** The list of assessments in the current page. */
  content: t.array(OneTrustAssessmentCodec),
  /** Details about the pages being fetched */
  page: t.type({
    /** Page number of the results list (0…N). */
    number: t.number,
    /** Number of records per page (0…N). */
    size: t.number,
    /** Total number of elements. */
    totalElements: t.number,
    /** Total number of pages. */
    totalPages: t.number,
  }),
});

/** Type override */
export type OneTrustGetListOfAssessmentsResponseCodec = t.TypeOf<
  typeof OneTrustGetListOfAssessmentsResponseCodec
>;

export const OneTrustAssessmentQuestionOptionCodec = t.type({
  /** ID of the option. */
  id: t.string,
  /** Name of the option. */
  option: t.string,
  /** Order in which the option appears. */
  sequence: t.union([t.number, t.null]),
  /** Attribute for which the option is available. */
  attributes: t.union([t.string, t.null]),
  /** Type of option. */
  optionType: t.union([
    t.literal('NOT_SURE'),
    t.literal('NOT_APPLICABLE'),
    t.literal('OTHERS'),
    t.literal('DEFAULT'),
  ]),
});
/** Type override */
export type OneTrustAssessmentQuestionOptionCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionOptionCodec
>;

export const OneTrustAssessmentQuestionRiskCodec = t.intersection([
  t.type({
    /** ID of the question for which the risk was flagged. */
    questionId: t.string,
    /** ID of the flagged risk. */
    riskId: t.string,
  }),
  t.partial({
    /** Level of risk flagged on the question. */
    level: t.union([t.number, t.null]),
    /** Score of risk flagged on the question. */
    score: t.union([t.number, t.null]),
    /** Probability of risk flagged on the question. */
    probability: t.union([t.number, t.undefined]),
    /** Impact Level of risk flagged on the question. */
    impactLevel: t.union([t.number, t.undefined]),
  }),
]);

/** Type override */
export type OneTrustAssessmentQuestionRiskCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionRiskCodec
>;

export const OneTrustAssessmentQuestionRisksCodec = t.union([
  t.array(OneTrustAssessmentQuestionRiskCodec),
  t.null,
]);
/** Type override */
export type OneTrustAssessmentQuestionRisksCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionRisksCodec
>;

export const OneTrustAssessmentQuestionResponseCodec = t.type({
  /** The responses */
  responses: t.array(
    t.type({
      /** ID of the response. */
      responseId: t.string,
      /** Content of the response. */
      response: t.union([t.string, t.null]),
      /** Type of response. */
      type: t.union([
        t.literal('NOT_SURE'),
        t.literal('JUSTIFICATION'),
        t.literal('NOT_APPLICABLE'),
        t.literal('DEFAULT'),
        t.literal('OTHERS'),
      ]),
      /** Source from which the assessment is launched. */
      responseSourceType: t.union([
        t.literal('LAUNCH_FROM_INVENTORY'),
        t.literal('FORCE_CREATED_SOURCE'),
        t.null,
      ]),
      /** Error associated with the response. */
      errorCode: t.union([
        t.literal('ATTRIBUTE_DISABLED'),
        t.literal('ATTRIBUTE_OPTION_DISABLED'),
        t.literal('INVENTORY_NOT_EXISTS'),
        t.literal('RELATED_INVENTORY_ATTRIBUTE_DISABLED'),
        t.literal('DATA_ELEMENT_NOT_EXISTS'),
        t.literal('DUPLICATE_INVENTORY'),
        t.null,
      ]),
      /** This parameter is only applicable for inventory type responses (Example- ASSETS). */
      responseMap: t.object,
      /** Indicates whether the response is valid. */
      valid: t.boolean,
      /** The data subject */
      dataSubject: t.union([
        t.type({
          /** The ID of the data subject */
          id: t.union([t.string, t.null]),
          /** The ID of the data subject */
          name: t.union([t.string, t.null]),
          /** The nameKey of the data category */
          nameKey: t.union([t.string, t.null]),
        }),
        t.null,
      ]),
      /** The data category */
      dataCategory: t.union([
        t.type({
          /** The ID of the data category */
          id: t.union([t.string, t.null]),
          /** The name of the data category */
          name: t.union([t.string, t.null]),
          /** The nameKey of the data category */
          nameKey: t.union([t.string, t.null]),
        }),
        t.null,
      ]),
      /** The data element */
      dataElement: t.union([
        t.type({
          /** The ID of the data element */
          id: t.union([t.string, t.null]),
          /** The ID of the data element */
          name: t.union([t.string, t.null]),
        }),
        t.null,
      ]),
    }),
  ),
  /** Justification comments for the given response. */
  justification: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustAssessmentQuestionResponseCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionResponseCodec
>;

export const OneTrustAssessmentQuestionResponsesCodec = t.array(
  OneTrustAssessmentQuestionResponseCodec,
);
/** Type override */
export type OneTrustAssessmentQuestionResponsesCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionResponsesCodec
>;

export const OneTrustAssessmentNestedQuestionCodec = t.type({
  /** ID of the question. */
  id: t.string,
  /** ID of the root version of the question. */
  rootVersionId: t.string,
  /** Order in which the question appears in the assessment. */
  sequence: t.number,
  /** Type of question in the assessment. */
  questionType: t.union([
    t.literal('TEXTBOX'),
    t.literal('MULTICHOICE'),
    t.literal('YESNO'),
    t.literal('DATE'),
    t.literal('STATEMENT'),
    t.literal('INVENTORY'),
    t.literal('ATTRIBUTE'),
    t.literal('PERSONAL_DATA'),
    t.literal('ENGAGEMENT'),
    t.literal('ASSESS_CONTROL'),
    t.null,
  ]),
  /** Indicates whether a response to the question is required. */
  required: t.boolean,
  /** Data element attributes that are directly updated by the question. */
  attributes: t.string,
  /** Short, descriptive name for the question. */
  friendlyName: t.union([t.string, t.null]),
  /** Description of the question. */
  description: t.union([t.string, t.null]),
  /** Tooltip text within a hint for the question. */
  hint: t.union([t.string, t.null]),
  /** ID of the parent question. */
  parentQuestionId: t.union([t.string, t.null]),
  /** Indicates whether the response to the question is prepopulated. */
  prePopulateResponse: t.boolean,
  /** Indicates whether the assessment is linked to inventory records. */
  linkAssessmentToInventory: t.boolean,
  /** The question options */
  options: t.union([t.array(OneTrustAssessmentQuestionOptionCodec), t.null]),
  /** Indicates whether the question is valid. */
  valid: t.boolean,
  /** Type of question in the assessment. */
  type: t.union([
    t.literal('TEXTBOX'),
    t.literal('MULTICHOICE'),
    t.literal('YESNO'),
    t.literal('DATE'),
    t.literal('STATEMENT'),
    t.literal('INVENTORY'),
    t.literal('ATTRIBUTE'),
    t.literal('PERSONAL_DATA'),
    t.literal('ENGAGEMENT'),
    t.literal('ASSESS_CONTROL'),
  ]),
  /** Whether the response can be multi select */
  allowMultiSelect: t.boolean,
  /** The text of a question. */
  content: t.string,
  /** Indicates whether justification comments are required for the question. */
  requireJustification: t.boolean,
});

/** Type override */
export type OneTrustAssessmentNestedQuestionCodec = t.TypeOf<
  typeof OneTrustAssessmentNestedQuestionCodec
>;

// TODO: do not add to privacy-types
/**  OneTrustAssessmentNestedQuestionCodec without nested options */
export const OneTrustAssessmentNestedQuestionFlatCodec = t.type({
  id: OneTrustAssessmentNestedQuestionCodec.props.id,
  rootVersionId: OneTrustAssessmentNestedQuestionCodec.props.rootVersionId,
  sequence: OneTrustAssessmentNestedQuestionCodec.props.sequence,
  questionType: OneTrustAssessmentNestedQuestionCodec.props.questionType,
  required: OneTrustAssessmentNestedQuestionCodec.props.required,
  attributes: OneTrustAssessmentNestedQuestionCodec.props.attributes,
  friendlyName: OneTrustAssessmentNestedQuestionCodec.props.friendlyName,
  description: OneTrustAssessmentNestedQuestionCodec.props.description,
  hint: OneTrustAssessmentNestedQuestionCodec.props.hint,
  parentQuestionId:
    OneTrustAssessmentNestedQuestionCodec.props.parentQuestionId,
  prePopulateResponse:
    OneTrustAssessmentNestedQuestionCodec.props.prePopulateResponse,
  linkAssessmentToInventory:
    OneTrustAssessmentNestedQuestionCodec.props.linkAssessmentToInventory,
  valid: OneTrustAssessmentNestedQuestionCodec.props.valid,
  type: OneTrustAssessmentNestedQuestionCodec.props.type,
  allowMultiSelect:
    OneTrustAssessmentNestedQuestionCodec.props.allowMultiSelect,
  content: OneTrustAssessmentNestedQuestionCodec.props.content,
  requireJustification:
    OneTrustAssessmentNestedQuestionCodec.props.requireJustification,
});

/** Type override */
export type OneTrustAssessmentNestedQuestionFlatCodec = t.TypeOf<
  typeof OneTrustAssessmentNestedQuestionFlatCodec
>;

export const OneTrustAssessmentQuestionCodec = t.type({
  /** The question */
  question: OneTrustAssessmentNestedQuestionCodec,
  /** Indicates whether the question is hidden on the assessment. */
  hidden: t.boolean,
  /** Reason for locking the question in the assessment. */
  lockReason: t.union([
    t.literal('LAUNCH_FROM_INVENTORY'),
    t.literal('FORCE_CREATION_LOCK'),
    t.null,
  ]),
  /** The copy errors */
  copyErrors: t.union([t.string, t.null]),
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: t.boolean,
  /** The responses to this question */
  questionResponses: t.array(OneTrustAssessmentQuestionResponseCodec),
  /** The risks associated with this question */
  risks: t.union([t.array(OneTrustAssessmentQuestionRiskCodec), t.null]),
  /** List of IDs associated with the question root requests. */
  rootRequestInformationIds: t.array(t.string),
  /** Number of attachments added to the question. */
  totalAttachments: t.number,
  /** IDs of the attachment(s) added to the question. */
  attachmentIds: t.array(t.string),
});

/** Type override */
export type OneTrustAssessmentQuestionCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionCodec
>;

// TODO: do not add to privacy types
// The OneTrustAssessmentQuestionCodec without nested properties
export const OneTrustAssessmentQuestionFlatCodec = t.type({
  hidden: OneTrustAssessmentQuestionCodec.props.hidden,
  lockReason: OneTrustAssessmentQuestionCodec.props.lockReason,
  copyErrors: OneTrustAssessmentQuestionCodec.props.copyErrors,
  hasNavigationRules: OneTrustAssessmentQuestionCodec.props.hasNavigationRules,
  rootRequestInformationIds:
    OneTrustAssessmentQuestionCodec.props.rootRequestInformationIds,
  totalAttachments: OneTrustAssessmentQuestionCodec.props.totalAttachments,
  attachmentIds: OneTrustAssessmentQuestionCodec.props.attachmentIds,
});

/** Type override */
export type OneTrustAssessmentQuestionFlatCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionFlatCodec
>;

export const OneTrustAssessmentSectionHeaderRiskStatisticsCodec = t.union([
  t.type({
    /** Maximum level of risk in the section. */
    maxRiskLevel: t.union([t.number, t.null]),
    /** Number of risks in the section. */
    riskCount: t.union([t.number, t.null]),
    /** ID of the section in the assessment. */
    sectionId: t.union([t.string, t.null]),
  }),
  t.null,
]);

/** Type override */
export type OneTrustAssessmentSectionHeaderRiskStatisticsCodec = t.TypeOf<
  typeof OneTrustAssessmentSectionHeaderRiskStatisticsCodec
>;

export const OneTrustAssessmentSectionHeaderCodec = t.type({
  /** ID of the section in the assessment. */
  sectionId: t.string,
  /** Name of the section. */
  name: t.string,
  /** Description of the section header. */
  description: t.union([t.string, t.null]),
  /** Sequence of the section within the form */
  sequence: t.number,
  /** Indicates whether the section is hidden in the assessment. */
  hidden: t.boolean,
  /** IDs of invalid questions in the section. */
  invalidQuestionIds: t.array(t.string),
  /** IDs of required but unanswered questions in the section. */
  requiredUnansweredQuestionIds: t.array(t.string),
  /** IDs of required questions in the section. */
  requiredQuestionIds: t.array(t.string),
  /** IDs of unanswered questions in the section. */
  unansweredQuestionIds: t.array(t.string),
  /** IDs of effectiveness questions in the section. */
  effectivenessQuestionIds: t.array(t.string),
  /** The risk statistics */
  riskStatistics: OneTrustAssessmentSectionHeaderRiskStatisticsCodec,
  /** Whether the section was submitted */
  submitted: t.boolean,
});
/** Type override */
export type OneTrustAssessmentSectionHeaderCodec = t.TypeOf<
  typeof OneTrustAssessmentSectionHeaderCodec
>;

// TODO: do not add to privacy-types
/** The OneTrustAssessmentSectionHeaderCodec without nested riskStatistics  */
export const OneTrustAssessmentSectionFlatHeaderCodec = t.type({
  sectionId: OneTrustAssessmentSectionHeaderCodec.props.sectionId,
  name: OneTrustAssessmentSectionHeaderCodec.props.name,
  description: OneTrustAssessmentSectionHeaderCodec.props.description,
  sequence: OneTrustAssessmentSectionHeaderCodec.props.sequence,
  hidden: OneTrustAssessmentSectionHeaderCodec.props.hidden,
  invalidQuestionIds:
    OneTrustAssessmentSectionHeaderCodec.props.invalidQuestionIds,
  requiredUnansweredQuestionIds:
    OneTrustAssessmentSectionHeaderCodec.props.requiredUnansweredQuestionIds,
  requiredQuestionIds:
    OneTrustAssessmentSectionHeaderCodec.props.requiredQuestionIds,
  unansweredQuestionIds:
    OneTrustAssessmentSectionHeaderCodec.props.unansweredQuestionIds,
  effectivenessQuestionIds:
    OneTrustAssessmentSectionHeaderCodec.props.effectivenessQuestionIds,
  submitted: OneTrustAssessmentSectionHeaderCodec.props.submitted,
});
/** Type override */
export type OneTrustAssessmentSectionFlatHeaderCodec = t.TypeOf<
  typeof OneTrustAssessmentSectionFlatHeaderCodec
>;

export const OneTrustAssessmentSectionSubmittedByCodec = t.union([
  t.type({
    /** The ID of the user who submitted the section */
    id: t.string,
    /** THe name or email of the user who submitted the section */
    name: t.string,
  }),
  t.null,
]);

/** Type override */
export type OneTrustAssessmentSectionSubmittedByCodec = t.TypeOf<
  typeof OneTrustAssessmentSectionSubmittedByCodec
>;

export const OneTrustAssessmentSectionCodec = t.type({
  /** The Assessment section header */
  header: OneTrustAssessmentSectionHeaderCodec,
  /** The questions within the section */
  questions: t.array(OneTrustAssessmentQuestionCodec),
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: t.boolean,
  /** Who submitted the section */
  submittedBy: OneTrustAssessmentSectionSubmittedByCodec,
  /** Date of the submission */
  submittedDt: t.union([t.string, t.null]),
  /** Name of the section. */
  name: t.string,
  /** Indicates whether navigation rules are enabled for the question. */
  hidden: t.boolean,
  /** Indicates whether the section is valid. */
  valid: t.boolean,
  /** ID of the section in an assessment. */
  sectionId: t.string,
  /** Sequence of the section within the form */
  sequence: t.number,
  /** Whether the section was submitted */
  submitted: t.boolean,
  /** Descriptions of the section. */
  description: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustAssessmentSectionCodec = t.TypeOf<
  typeof OneTrustAssessmentSectionCodec
>;

// TODO: do not move to privacy-types
/** The OneTrustAssessmentSectionCodec type without header or questions */
export const OneTrustFlatAssessmentSectionCodec = t.type({
  hasNavigationRules: OneTrustAssessmentSectionCodec.props.hasNavigationRules,
  submittedBy: OneTrustAssessmentSectionCodec.props.submittedBy,
  submittedDt: OneTrustAssessmentSectionCodec.props.submittedDt,
  name: OneTrustAssessmentSectionCodec.props.name,
  hidden: OneTrustAssessmentSectionCodec.props.hidden,
  valid: OneTrustAssessmentSectionCodec.props.valid,
  sectionId: OneTrustAssessmentSectionCodec.props.sectionId,
  sequence: OneTrustAssessmentSectionCodec.props.sequence,
  submitted: OneTrustAssessmentSectionCodec.props.submitted,
  description: OneTrustAssessmentSectionCodec.props.description,
});

/** Type override */
export type OneTrustFlatAssessmentSectionCodec = t.TypeOf<
  typeof OneTrustFlatAssessmentSectionCodec
>;

export const OneTrustApproverCodec = t.type({
  /** ID of the user assigned as an approver. */
  id: t.string,
  /** ID of the workflow stage */
  workflowStageId: t.string,
  /** Name of the user assigned as an approver. */
  name: t.string,
  /** More details about the approver */
  approver: t.type({
    /** ID of the user assigned as an approver. */
    id: t.string,
    /** Full name of the user assigned as an approver. */
    fullName: t.string,
    /** Email of the user assigned as an approver. */
    email: t.union([t.string, t.null]),
    /** Whether the user assigned as an approver was deleted. */
    deleted: t.boolean,
  }),
  /** Assessment approval status. */
  approvalState: t.union([
    t.literal('OPEN'),
    t.literal('APPROVED'),
    t.literal('REJECTED'),
  ]),
  /** Date and time at which the assessment was approved. */
  approvedOn: t.union([t.string, t.null]),
  /** ID of the assessment result. */
  resultId: t.union([t.string, t.null]),
  /** Name of the assessment result. */
  resultName: t.union([
    t.literal('Approved - Remediation required'),
    t.literal('Approved'),
    t.literal('Rejected'),
    t.literal('Assessment suspended - On Hold'),
    t.string,
    t.null,
  ]),
  /** Name key of the assessment result. */
  resultNameKey: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustApproverCodec = t.TypeOf<typeof OneTrustApproverCodec>;

export const OneTrustAssessmentStatusCodec = t.union([
  t.literal('NOT_STARTED'),
  t.literal('IN_PROGRESS'),
  t.literal('UNDER_REVIEW'),
  t.literal('COMPLETED'),
]);
/** Type override */
export type OneTrustAssessmentStatusCodec = t.TypeOf<
  typeof OneTrustAssessmentStatusCodec
>;

export const OneTrustPrimaryEntityDetailsCodec = t.array(
  t.type({
    /** Unique ID for the primary record. */
    id: t.string,
    /** Name of the primary record. */
    name: t.string,
    /** The number associated with the primary record. */
    number: t.number,
    /** Name and number of the primary record. */
    displayName: t.string,
  }),
);
/** Type override */
export type OneTrustPrimaryEntityDetailsCodec = t.TypeOf<
  typeof OneTrustPrimaryEntityDetailsCodec
>;

// ref: https://developer.onetrust.com/onetrust/reference/exportassessmentusingget
export const OneTrustGetAssessmentResponseCodec = t.type({
  /** List of users assigned as approvers of the assessment. */
  approvers: t.array(OneTrustApproverCodec),
  /** ID of an assessment. */
  assessmentId: t.string,
  /** Number assigned to an assessment. */
  assessmentNumber: t.number,
  /** Date and time at which the assessment was completed. */
  completedOn: t.union([t.string, t.null]),
  /** Status of the assessment. */
  status: OneTrustAssessmentStatusCodec,
  /** Creator of the Assessment */
  createdBy: t.type({
    /** The ID of the creator */
    id: t.string,
    /** The name of the creator */
    name: t.string,
  }),
  /** Date and time at which the assessment was created. */
  createdDT: t.string,
  /** Date and time by which the assessment must be completed. */
  deadline: t.union([t.string, t.null]),
  /** Description of the assessment. */
  description: t.union([t.string, t.null]),
  /** Overall inherent risk score without considering the existing controls. */
  inherentRiskScore: t.union([t.number, t.null]),
  /** Date and time at which the assessment was last updated. */
  lastUpdated: t.string,
  /** Number of risks captured on the assessment with a low risk level. */
  lowRisk: t.number,
  /** Number of risks captured on the assessment with a medium risk level. */
  mediumRisk: t.number,
  /** Number of risks captured on the assessment with a high risk level. */
  highRisk: t.number,
  /** Name of the assessment. */
  name: t.string,
  /** Number of open risks that have not been addressed. */
  openRiskCount: t.number,
  /** The organization group */
  orgGroup: t.type({
    /** The ID of the organization group */
    id: t.string,
    /** The name of the organization group */
    name: t.string,
  }),
  /** The primary record */
  primaryEntityDetails: OneTrustPrimaryEntityDetailsCodec,
  /** Type of inventory record designated as the primary record. */
  primaryRecordType: t.union([
    t.literal('ASSETS'),
    t.literal('PROCESSING_ACTIVITY'),
    t.literal('VENDORS'),
    t.literal('ENTITIES'),
    t.literal('ASSESS_CONTROL'),
    t.literal('ENGAGEMENT'),
    t.literal('projects'),
    t.null,
  ]),
  /** Overall risk score after considering existing controls. */
  residualRiskScore: t.union([t.number, t.null]),
  /** The respondent */
  respondent: t.type({
    /** The ID of the respondent */
    id: t.string,
    /** The name or email of the respondent */
    name: t.string,
  }),
  /** The respondents */
  respondents: t.array(
    t.type({
      /** The ID of the respondent */
      id: t.string,
      /** The name or email of the respondent */
      name: t.string,
    }),
  ),
  /** Result of the assessment. */
  result: t.union([t.string, t.null]),
  /** ID of the result. */
  resultId: t.union([t.string, t.null]),
  /** Name of the result. */
  resultName: t.union([
    t.literal('Approved - Remediation required'),
    t.literal('Approved'),
    t.literal('Rejected'),
    t.literal('Assessment suspended - On Hold'),
    t.string,
    t.null,
  ]),
  /** Risk level of the assessment. */
  riskLevel: t.union([
    t.literal('None'),
    t.literal('Low'),
    t.literal('Medium'),
    t.literal('High'),
    t.literal('Very High'),
  ]),
  /** List of sections in the assessment. */
  sections: t.array(OneTrustAssessmentSectionCodec),
  /** Date and time at which the assessment was submitted. */
  submittedOn: t.union([t.string, t.null]),
  /** List of tags associated with the assessment. */
  tags: t.array(t.string),
  /** The desired target risk score. */
  targetRiskScore: t.union([t.number, t.null]),
  /** The template */
  template: t.type({
    /** The ID of the template */
    id: t.string,
    /** The name of the template */
    name: t.string,
  }),
  /** Number of total risks on the assessment. */
  totalRiskCount: t.number,
  /** Number of very high risks on the assessment. */
  veryHighRisk: t.number,
  /** Welcome text if any in the assessment. */
  welcomeText: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustGetAssessmentResponseCodec = t.TypeOf<
  typeof OneTrustGetAssessmentResponseCodec
>;

const EntityTypeCodec = t.type({
  /** Indicates whether entity type is eligible for linking/relating with risk or not */
  eligibleForEntityLink: t.boolean,
  /** Indicates whether the entity type is enabled or not. */
  enabled: t.boolean,
  /** Entity Type ID. This can be Assets, Entities, PIA, Engagement, Custom Object GUID in form of String. */
  id: t.string,
  /** Entity Type Name. */
  label: t.string,
  /** Name of the module. */
  moduleName: t.union([t.string, t.null]),
  /** Indicates whether this type can be risk type or not in Risk */
  riskType: t.boolean,
  /** For Base Entity Type Seeded is true and false for Custom Object/Entity Types by default. */
  seeded: t.boolean,
  /** Indicates whether this type can be source type or not in Risk */
  sourceType: t.boolean,
  /** Translation Key of Entity Type ID. */
  translationKey: t.string,
});

const RiskLevelCodec = t.type({
  /** Risk Impact Level name. */
  impactLevel: t.union([t.string, t.null]),
  /** Risk Impact level ID. */
  impactLevelId: t.union([t.number, t.null]),
  /** Risk Level Name. */
  level: t.union([t.string, t.null]),
  /** Risk Level ID. */
  levelId: t.union([t.number, t.null]),
  /** Risk Probability Level Name. */
  probabilityLevel: t.union([t.string, t.null]),
  /** Risk Probability Level ID. */
  probabilityLevelId: t.union([t.number, t.null]),
  /** Risk Score. */
  riskScore: t.union([t.number, t.null]),
});

// ref: https://developer.onetrust.com/onetrust/reference/getriskusingget
export const OneTrustGetRiskResponseCodec = t.type({
  /** List of associated inventories to the risk. */
  associatedInventories: t.array(
    t.type({
      /** ID of the Inventory. */
      inventoryId: t.string,
      /** Name of the Inventory. */
      inventoryName: t.string,
      /** Type of the Inventory. */
      inventoryType: t.union([
        t.literal('ASSETS'),
        t.literal('PROCESSING_ACTIVITIES'),
        t.literal('VENDORS'),
        t.literal('ENTITIES'),
        t.null,
      ]),
      /** ID of the Inventory's Organization. */
      organizationId: t.union([t.string, t.null]),
      /** The source type */
      sourceType: EntityTypeCodec,
    }),
  ),
  /** The attribute values associated with the risk */
  attributeValues: t.object,
  /** List of categories. */
  categories: t.array(
    t.type({
      /** Identifier for Risk Category. */
      id: t.string,
      /** Risk Category Name. */
      name: t.string,
      /** Risk Category Name Key value for translation. */
      nameKey: t.string,
    }),
  ),
  /** List of Control Identifiers. */
  controlsIdentifier: t.array(t.string),
  /** Risk created time. */
  createdUTCDateTime: t.union([t.string, t.null]),
  /** Risk Creation Type. */
  creationType: t.union([t.string, t.null]),
  /** Date when the risk is closed. */
  dateClosed: t.union([t.string, t.null]),
  /** Deadline date for the risk. */
  deadline: t.union([t.string, t.null]),
  /** Risk delete type. */
  deleteType: t.union([t.literal('SOFT'), t.null]),
  /** Risk description. */
  description: t.union([t.string, t.null]),
  /** ID of the risk. */
  id: t.string,
  /** Residual impact level name. */
  impactLevel: t.union([t.string, t.null]),
  /** Residual impact level ID. */
  impactLevelId: t.union([t.number, t.null]),
  /** The inherent risk level */
  inherentRiskLevel: RiskLevelCodec,
  /** The risk justification */
  justification: t.union([t.string, t.null]),
  /** Residual level display name. */
  levelDisplayName: t.union([t.string, t.null]),
  /** Residual level ID. */
  levelId: t.union([t.number, t.null]),
  /** Risk mitigated date. */
  mitigatedDate: t.union([t.string, t.null]),
  /** Risk Mitigation details. */
  mitigation: t.union([t.string, t.null]),
  /** Short Name for a Risk. */
  name: t.union([t.string, t.null]),
  /** Integer risk identifier. */
  number: t.number,
  /** The organization group */
  orgGroup: t.type({
    /** ID of an entity. */
    id: t.string,
    /** Name of an entity. */
    name: t.string,
  }),
  /** The previous risk state */
  previousState: t.union([
    t.literal('IDENTIFIED'),
    t.literal('RECOMMENDATION_ADDED'),
    t.literal('RECOMMENDATION_SENT'),
    t.literal('REMEDIATION_PROPOSED'),
    t.literal('EXCEPTION_REQUESTED'),
    t.literal('REDUCED'),
    t.literal('RETAINED'),
    t.literal('ARCHIVED_IN_VERSION'),
    t.null,
  ]),
  /** Residual probability level. */
  probabilityLevel: t.union([t.string, t.null]),
  /** Residual probability level ID. */
  probabilityLevelId: t.union([t.number, t.null]),
  /** Risk Recommendation. */
  recommendation: t.union([t.string, t.null]),
  /** Proposed remediation. */
  remediationProposal: t.union([t.string, t.null]),
  /** Deadline reminder days. */
  reminderDays: t.union([t.number, t.null]),
  /** Risk exception request. */
  requestedException: t.union([t.string, t.null]),
  /** Risk Result. */
  result: t.union([
    t.literal('Accepted'),
    t.literal('Avoided'),
    t.literal('Reduced'),
    t.literal('Rejected'),
    t.literal('Transferred'),
    t.literal('Ignored'),
    t.null,
  ]),
  /** Risk approvers name csv. */
  riskApprovers: t.union([t.string, t.null]),
  /** Risk approvers ID. */
  riskApproversId: t.array(t.string),
  /** List of risk owners ID. */
  riskOwnersId: t.union([t.array(t.string), t.null]),
  /** Risk owners name csv. */
  riskOwnersName: t.union([t.string, t.null]),
  /** Risk score. */
  riskScore: t.union([t.number, t.null]),
  /** The risk source type */
  riskSourceType: EntityTypeCodec,
  /** The risk type */
  riskType: EntityTypeCodec,
  /** For Auto risk, rule Id reference. */
  ruleRootVersionId: t.union([t.string, t.null]),
  /** The risk source */
  source: t.type({
    /** Additional information about the Source Entity */
    additionalAttributes: t.object,
    /** Source Entity ID. */
    id: t.string,
    /** Source Entity Name. */
    name: t.string,
    /** The risk source type */
    sourceType: EntityTypeCodec,
    /** Source Entity Type. */
    type: t.union([
      t.literal('PIA'),
      t.literal('RA'),
      t.literal('GRA'),
      t.literal('INVENTORY'),
      t.literal('INCIDENT'),
      t.literal('GENERIC'),
    ]),
  }),
  /** The risk stage */
  stage: t.type({
    /** ID of an entity. */
    id: t.string,
    /** Name of an entity. */
    name: t.string,
    /** Name Key of the entity for translation. */
    nameKey: t.string,
  }),
  /** The risk state */
  state: t.union([
    t.literal('IDENTIFIED'),
    t.literal('RECOMMENDATION_ADDED'),
    t.literal('RECOMMENDATION_SENT'),
    t.literal('REMEDIATION_PROPOSED'),
    t.literal('EXCEPTION_REQUESTED'),
    t.literal('REDUCED'),
    t.literal('RETAINED'),
    t.literal('ARCHIVED_IN_VERSION'),
  ]),
  /** The target risk level */
  targetRiskLevel: RiskLevelCodec,
  /** The risk threat */
  threat: t.union([
    t.type({
      /** Threat ID. */
      id: t.string,
      /** Threat Identifier. */
      identifier: t.string,
      /** Threat Name. */
      name: t.string,
    }),
    t.null,
  ]),
  /** Risk Treatment. */
  treatment: t.union([t.string, t.null]),
  /** Risk Treatment status. */
  treatmentStatus: t.union([
    t.literal('InProgress'),
    t.literal('UnderReview'),
    t.literal('ExceptionRequested'),
    t.literal('Approved'),
    t.literal('ExceptionGranted'),
    t.null,
  ]),
  /** Risk Type. */
  type: t.union([
    t.literal('ASSESSMENTS'),
    t.literal('ASSETS'),
    t.literal('PROCESSING_ACTIVITIES'),
    t.literal('VENDORS'),
    t.literal('ENTITIES'),
    t.literal('INCIDENTS'),
    t.literal('ENGAGEMENTS'),
    t.null,
  ]),
  /** ID of an assessment. */
  typeRefIds: t.array(t.string),
  /** List of vulnerabilities */
  vulnerabilities: t.union([
    t.array(
      t.type({
        /** Vulnerability ID. */
        id: t.string,
        /** Vulnerability Identifier. */
        identifier: t.string,
        /** Vulnerability Name. */
        name: t.string,
      }),
    ),
    t.null,
  ]),
  /** The risk workflow */
  workflow: t.type({
    /** ID of an entity. */
    id: t.string,
    /** Name of an entity. */
    name: t.string,
  }),
});

/** Type override */
export type OneTrustGetRiskResponseCodec = t.TypeOf<
  typeof OneTrustGetRiskResponseCodec
>;

// TODO: do not move to privacy-types
export const OneTrustEnrichedRiskCodec = t.intersection([
  OneTrustAssessmentQuestionRiskCodec,
  t.type({
    description: OneTrustGetRiskResponseCodec.props.description,
    name: OneTrustGetRiskResponseCodec.props.name,
    treatment: OneTrustGetRiskResponseCodec.props.treatment,
    treatmentStatus: OneTrustGetRiskResponseCodec.props.treatmentStatus,
    type: OneTrustGetRiskResponseCodec.props.type,
    stage: OneTrustGetRiskResponseCodec.props.stage,
    state: OneTrustGetRiskResponseCodec.props.state,
    result: OneTrustGetRiskResponseCodec.props.result,
    categories: OneTrustGetRiskResponseCodec.props.categories,
  }),
]);

/** Type override */
export type OneTrustEnrichedRiskCodec = t.TypeOf<
  typeof OneTrustEnrichedRiskCodec
>;

/* eslint-enable max-lines */
