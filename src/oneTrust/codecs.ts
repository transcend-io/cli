/* eslint-disable max-lines */
import * as t from 'io-ts';

// TODO: move all to privacy-types

export const OneTrustAssessmentCodec = t.type({
  /** ID of the assessment. */
  assessmentId: t.string,
  /** Date that the assessment was created. */
  createDt: t.string,
  /** Overall risk score without considering existing controls. */
  inherentRiskScore: t.number,
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
  primaryInventoryDetails: t.type({
    /** GUID of the inventory record. */
    primaryInventoryId: t.string,
    /** Name of the inventory record. */
    primaryInventoryName: t.string,
    /** Integer ID of the inventory record. */
    primaryInventoryNumber: t.number,
  }),
  /** Overall risk score after considering existing controls. */
  residualRiskScore: t.number,
  /** Result of the assessment. NOTE: This field will be deprecated soon. Please reference the 'resultName' field instead. */
  result: t.union([
    t.literal('Approved'),
    t.literal('AutoClosed'),
    t.literal('Rejected'),
  ]),
  /** ID of the result. */
  resultId: t.string,
  /** Name of the result. */
  resultName: t.union([
    t.literal('Approved - Remediation required'),
    t.literal('Approved'),
    t.literal('Rejected'),
    t.literal('Assessment suspended - On Hold'),
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
  ]),
  /** Name of the tag attached to the assessment. */
  tags: t.array(t.string),
  /** The desired risk score. */
  targetRiskScore: t.number,
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

const OneTrustAssessmentQuestionOptionCodec = t.type({
  /** ID of the option. */
  id: t.string,
  /** Name of the option. */
  option: t.string,
  /** Order in which the option appears. */
  sequence: t.number,
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

export const OneTrustAssessmentQuestionRiskCodec = t.type({
  /** ID of the question for which the risk was flagged. */
  questionId: t.string,
  /** ID of the flagged risk. */
  riskId: t.string,
  /** Level of risk flagged on the question. */
  level: t.number,
  /** Score of risk flagged on the question. */
  score: t.number,
  /** Probability of risk flagged on the question. */
  probability: t.union([t.number, t.undefined]),
  /** Impact Level of risk flagged on the question. */
  impactLevel: t.union([t.number, t.undefined]),
});

/** Type override */
export type OneTrustAssessmentQuestionRiskCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionRiskCodec
>;

export const OneTrustAssessmentQuestionResponsesCodec = t.type({
  /** The responses */
  responses: t.array(
    t.type({
      /** ID of the response. */
      responseId: t.string,
      /** Content of the response. */
      response: t.string,
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
      dataSubject: t.type({
        /** The ID of the data subject */
        id: t.string,
        /** The ID of the data subject */
        name: t.string,
      }),
      /** The data category */
      dataCategory: t.type({
        /** The ID of the data category */
        id: t.string,
        /** The name of the data category */
        name: t.string,
      }),
      /** The data element */
      dataElement: t.type({
        /** The ID of the data element */
        id: t.string,
        /** The ID of the data element */
        name: t.string,
      }),
    }),
  ),
  /** Justification comments for the given response. */
  justification: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustAssessmentQuestionResponsesCodec = t.TypeOf<
  typeof OneTrustAssessmentQuestionResponsesCodec
>;

export const OneTrustAssessmentQuestionCodec = t.type({
  /** The question */
  question: t.type({
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
    hint: t.string,
    /** ID of the parent question. */
    parentQuestionId: t.string,
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
    ]),
    /** Whether the response can be multi select */
    allowMultiSelect: t.boolean,
    /** The text of a question. */
    content: t.string,
    /** Indicates whether justification comments are required for the question. */
    requireJustification: t.boolean,
  }),
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
  questionResponses: t.array(OneTrustAssessmentQuestionResponsesCodec),
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

export const OneTrustAssessmentSectionCodec = t.type({
  /** The Assessment section header */
  header: t.type({
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
    /** Number of invalid questions in the section. */
    invalidQuestionCount: t.number,
    /** The risk statistics */
    riskStatistics: t.union([
      t.type({
        /** Maximum level of risk in the section. */
        maxRiskLevel: t.number,
        /** Number of risks in the section. */
        riskCount: t.number,
        /** ID of the section in the assessment. */
        sectionId: t.string,
      }),
      t.null,
    ]),
    /** Whether the section was submitted */
    submitted: t.boolean,
  }),
  /** The questions within the section */
  questions: t.array(OneTrustAssessmentQuestionCodec),
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: t.boolean,
  /** Who submitted the section */
  submittedBy: t.union([
    t.type({
      /** The ID of the user who submitted the section */
      id: t.string,
      /** THe name or email of the user who submitted the section */
      name: t.string,
    }),
    t.null,
  ]),
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
  approvedOn: t.string,
  /** ID of the assessment result. */
  resultId: t.string,
  /** Name of the assessment result. */
  resultName: t.union([
    t.literal('Approved - Remediation required'),
    t.literal('Approved'),
    t.literal('Rejected'),
    t.literal('Assessment suspended - On Hold'),
    t.null,
  ]),
  /** Name key of the assessment result. */
  resultNameKey: t.string,
});

/** Type override */
export type OneTrustApproverCodec = t.TypeOf<typeof OneTrustApproverCodec>;

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
  primaryEntityDetails: t.array(
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
  ),
  /** Type of inventory record designated as the primary record. */
  primaryRecordType: t.union([
    t.literal('ASSETS'),
    t.literal('PROCESSING_ACTIVITY'),
    t.literal('VENDORS'),
    t.literal('ENTITIES'),
    t.literal('ASSESS_CONTROL'),
    t.literal('ENGAGEMENT'),
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
  status: t.union([
    t.literal('Not Started'),
    t.literal('In Progress'),
    t.literal('Under Review'),
    t.literal('Completed'),
    t.null,
  ]),
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
  moduleName: t.boolean,
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
  impactLevel: t.string,
  /** Risk Impact level ID. */
  impactLevelId: t.number,
  /** Risk Level Name. */
  level: t.string,
  /** Risk Level ID. */
  levelId: t.number,
  /** Risk Probability Level Name. */
  probabilityLevel: t.string,
  /** Risk Probability Level ID. */
  probabilityLevelId: t.number,
  /** Risk Score. */
  riskScore: t.number,
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
      inventoryType: t.literal('ASSETS PROCESSING_ACTIVITIES VENDORS ENTITIES'),
      /** ID of the Inventory's Organization. */
      organizationId: t.string,
      /** The source type */
      sourceType: EntityTypeCodec,
    }),
  ),
  /** The attribute values associated with the risk */
  attributeValues: t.type({
    /** List of custom attributes. */
    additionalProp: t.array(
      t.type({
        /** Additional information like Source Questions, Approver Ids, Inventory Type. This will be a Map of String Key and Object value. */
        additionalAttributes: t.object,
        /** Attribute option GUID. */
        id: t.string,
        /** Attribute selection value and it is mandatory if the numeric value is not distinct for Numerical Single Select attribute. */
        optionSelectionValue: t.string,
        /** Attribute option value. */
        value: t.string,
        /** Attribute option value key for translation. */
        valueKey: t.string,
      }),
    ),
  }),
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
  createdUTCDateTime: t.string,
  /** Risk Creation Type. */
  creationType: t.string,
  /** Date when the risk is closed. */
  dateClosed: t.string,
  /** Deadline date for the risk. */
  deadline: t.string,
  /** Risk delete type. */
  deleteType: t.literal('SOFT'),
  /** Risk description. */
  description: t.string,
  /** ID of the risk. */
  id: t.string,
  /** Residual impact level name. */
  impactLevel: t.string,
  /** Residual impact level ID. */
  impactLevelId: t.number,
  /** The inherent risk level */
  inherentRiskLevel: RiskLevelCodec,
  /** The risk justification */
  justification: t.string,
  /** Residual level display name. */
  levelDisplayName: t.string,
  /** Residual level ID. */
  levelId: t.number,
  /** Risk mitigated date. */
  mitigatedDate: t.string,
  /** Risk Mitigation details. */
  mitigation: t.string,
  /** Short Name for a Risk. */
  name: t.string,
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
  ]),
  /** Residual probability level. */
  probabilityLevel: t.string,
  /** Residual probability level ID. */
  probabilityLevelId: t.number,
  /** Risk Recommendation. */
  recommendation: t.string,
  /** Proposed remediation. */
  remediationProposal: t.string,
  /** Deadline reminder days. */
  reminderDays: t.number,
  /** Risk exception request. */
  requestedException: t.string,
  /** Risk Result. */
  result: t.union([
    t.literal('Accepted'),
    t.literal('Avoided'),
    t.literal('Reduced'),
    t.literal('Rejected'),
    t.literal('Transferred'),
    t.literal('Ignored'),
  ]),
  /** Risk approvers name csv. */
  riskApprovers: t.string,
  /** Risk approvers ID. */
  riskApproversId: t.array(t.string),
  /** List of risk owners ID. */
  riskOwnersId: t.array(t.string),
  /** Risk owners name csv. */
  riskOwnersName: t.string,
  /** Risk score. */
  riskScore: t.number,
  /** The risk source type */
  riskSourceType: EntityTypeCodec,
  /** The risk type */
  riskType: EntityTypeCodec,
  /** For Auto risk, rule Id reference. */
  ruleRootVersionId: t.string,
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
  threat: t.type({
    /** Threat ID. */
    id: t.string,
    /** Threat Identifier. */
    identifier: t.string,
    /** Threat Name. */
    name: t.string,
  }),
  /** Risk Treatment. */
  treatment: t.string,
  /** Risk Treatment status. */
  treatmentStatus: t.union([
    t.literal('InProgress'),
    t.literal('UnderReview'),
    t.literal('ExceptionRequested'),
    t.literal('Approved'),
    t.literal('ExceptionGranted'),
  ]),
  /** Risk Type. */
  type: t.union([
    t.literal('ASSESSMENTS'),
    t.literal('ASSETS'),
    t.literal('PROCESSING_ACTIVITIES'),
    t.literal('VENDORS'),
    t.literal('ENTITIES'),
    t.literal('INCIDENTS'),
  ]),
  /** ID of an assessment. */
  typeRefIds: t.array(t.string),
  /** List of vulnerabilities */
  vulnerabilities: t.array(
    t.type({
      /** Vulnerability ID. */
      id: t.string,
      /** Vulnerability Identifier. */
      identifier: t.string,
      /** Vulnerability Name. */
      name: t.string,
    }),
  ),
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

export const OneTrustRiskDetailsCodec = t.type({
  /** Risk description. */
  description: OneTrustGetRiskResponseCodec.props.description,
  /** Short Name for a Risk. */
  name: OneTrustGetRiskResponseCodec.props.name,
  /** Risk Treatment. */
  treatment: OneTrustGetRiskResponseCodec.props.treatment,
  /** Risk Treatment status. */
  treatmentStatus: OneTrustGetRiskResponseCodec.props.treatmentStatus,
  /** Risk Type. */
  type: OneTrustGetRiskResponseCodec.props.type,
  /** The risk stage */
  stage: OneTrustGetRiskResponseCodec.props.stage,
  /** The risk state */
  state: OneTrustGetRiskResponseCodec.props.state,
  /** Risk Result. */
  result: OneTrustGetRiskResponseCodec.props.result,
  /** List of categories. */
  categories: OneTrustGetRiskResponseCodec.props.categories,
});

/** Type override */
export type OneTrustRiskDetailsCodec = t.TypeOf<
  typeof OneTrustRiskDetailsCodec
>;

/* eslint-enable max-lines */
