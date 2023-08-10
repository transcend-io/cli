// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable max-lines */
import * as t from 'io-ts';
import { applyEnum, valuesOf } from '@transcend-io/type-utils';
import {
  DataCategoryType,
  ConsentBundleType,
  EnricherType,
  ProcessingPurpose,
  RequestAction,
  RequestActionObjectResolver,
  UspapiOption,
  DataFlowScope,
  PromptAVendorEmailSendType,
  ConsentPrecedenceOption,
  IsoCountryCode,
  BrowserTimeZone,
  IsoCountrySubdivisionCode,
  ConsentTrackerStatus,
  AttributeKeyType,
  PromptAVendorEmailCompletionLinkType,
  RegionsOperator,
  UnknownRequestPolicy,
  TelemetryPartitionStrategy,
  SignedIabAgreementOption,
  RegionDetectionMethod,
  PreflightRequestStatus,
  AttributeSupportedResourceType,
} from '@transcend-io/privacy-types';
import {
  InitialViewState,
  BrowserLanguage,
} from '@transcend-io/airgap.js-types';
import { buildEnabledRouteType } from './helpers/buildEnabledRouteType';
import { buildAIIntegrationType } from './helpers/buildAIIntegrationType';

/**
 * Input to define email templates that can be used to communicate to end-users
 * about the status of their requests
 *
 * @see https://docs.transcend.io/docs/privacy-requests/configuring-requests/email-templates
 */
export const TemplateInput = t.type({
  /** The title of the template */
  title: t.string,
});

/** Type override */
export type TemplateInput = t.TypeOf<typeof TemplateInput>;

export const WebhookHeader = t.intersection([
  t.type({
    /** The name of the header to set. */
    name: t.string,
    /** The value of the header. */
    value: t.string,
  }),
  t.partial({
    /** The header contains a secret */
    isSecret: t.boolean,
  }),
]);

/** Type override */
export type WebhookHeader = t.TypeOf<typeof WebhookHeader>;
/**
 * Input to define API keys that may be shared across data silos
 * in the data map. When creating new data silos through the yaml
 * cli, it is possible to specify which API key should be associated
 * with the newly created data silo.
 *
 * @see https://docs.transcend.io/docs/authentication
 */
export const ApiKeyInput = t.type({
  /** The display title of the enricher */
  title: t.string,
});

/** Type override */
export type ApiKeyInput = t.TypeOf<typeof ApiKeyInput>;

/**
 * Input to define an enricher
 *
 * Define enricher or pre-flight check webhooks that will be executed
 * prior to privacy request workflows. Some examples may include:
 *  - identity enrichment: look up additional identifiers for that user.
 *                         i.e. map an email address to a user ID
 *  - fraud check: auto-cancel requests if the user is flagged for fraudulent behavior
 *  - customer check: auto-cancel request for some custom business criteria
 *
 * @see https://docs.transcend.io/docs/identity-enrichment
 */
export const EnricherInput = t.intersection([
  t.type({
    /** The display title of the enricher */
    title: t.string,

    /**
     * The names of the identifiers that can be resolved by this enricher.
     * i.e. email -> [userId, phone, advertisingId]
     */
    'output-identifiers': t.array(t.string),
  }),
  t.partial({
    /** Internal description for why the enricher is needed */
    description: t.string,
    /** The URL of the enricher */
    url: t.string,
    /** The type of enricher */
    type: valuesOf(EnricherType),
    /**
     * The name of the identifier that will be the input to this enricher.
     * Whenever a privacy request contains this identifier, the webhook will
     * be called with the value of that identifier as input
     */
    'input-identifier': t.string,
    /**
     * A regular expression that can be used to match on for cancelation
     */
    testRegex: t.string,
    /**
     * For looker integration - the title of the looker query to run
     */
    lookerQueryTitle: t.string,
    /**
     * The duration (in ms) that the enricher should take to execute.
     */
    expirationDuration: t.number,
    /**
     * The status that the enricher should transfer to when condition is met.
     */
    transitionRequestStatus: valuesOf(PreflightRequestStatus),
    /**
     * For twilio integration - the phone numbers that can be used to send text codes
     */
    phoneNumbers: t.array(t.string),
    /** The list of regions that should trigger the preflight check */
    regionList: t.array(
      valuesOf({ ...IsoCountryCode, ...IsoCountrySubdivisionCode }),
    ),
    /**
     * Specify which data subjects the enricher should run for
     */
    'data-subjects': t.array(t.string),
    /** Headers to include in the webhook */
    headers: t.array(WebhookHeader),
    /** The privacy actions that the enricher should run against */
    'privacy-actions': t.array(valuesOf(RequestAction)),
  }),
]);

/** Type override */
export type EnricherInput = t.TypeOf<typeof EnricherInput>;

/**
 * The processing purpose for a field
 */
export const ProcessingPurposeInput = t.type({
  /** The parent purpose */
  purpose: valuesOf(ProcessingPurpose),
  /** User-defined name for this processing purpose sub category */
  name: t.string,
});

/** Type override */
export type ProcessingPurposeInput = t.TypeOf<typeof ProcessingPurposeInput>;

/**
 * The data category for a field
 */
export const DataCategoryInput = t.intersection([
  t.type({
    /** The parent category */
    category: valuesOf(DataCategoryType),
  }),
  t.partial({
    /** User-defined name for this sub category */
    name: t.string,
  }),
]);

/** Type override */
export type DataCategoryInput = t.TypeOf<typeof DataCategoryInput>;

export const AttributeValueInput = t.intersection([
  t.type({
    /** Name of attribute value */
    name: t.string,
  }),
  t.partial({
    /** Color */
    color: t.string,
  }),
]);

/** Type override */
export type AttributeValueInput = t.TypeOf<typeof AttributeValueInput>;

export const AttributeInput = t.intersection([
  t.type({
    /** Name of attribute */
    name: t.string,
    /** Type of attribute */
    type: valuesOf(AttributeKeyType),
  }),
  t.partial({
    /** Description of attribute */
    description: t.string,
    /** Resource types that the attribute is enabled on */
    resources: t.array(valuesOf(AttributeSupportedResourceType)),
    /** Values of attribute */
    values: t.array(AttributeValueInput),
  }),
]);

/** Type override */
export type AttributeInput = t.TypeOf<typeof AttributeInput>;

export const Attributes = t.type({
  /** Attribute key */
  key: t.string,
  /** Attribute values */
  values: t.array(t.string),
});

/** Type override */
export type Attributes = t.TypeOf<typeof Attributes>;

/**
 * Annotate specific fields within a datapoint. These are often database table columns.
 * Fields can also be a JSON object or separate file.
 */
export const FieldInput = t.intersection([
  t.type({
    /** The unique key of the field. When a database, this is the column name. */
    key: t.string,
  }),
  t.partial({
    /** The display title of the field */
    title: t.string,
    /** Description of the field */
    description: t.union([t.string, t.null]),
    /**
     * What is the purpose of processing for this datapoint/table?
     *
     * @see https://github.com/transcend-io/privacy-types/blob/main/src/objects.ts
     */
    purposes: t.array(ProcessingPurposeInput),
    /**
     * The category of personal data for this datapoint
     *
     * @see https://github.com/transcend-io/privacy-types/blob/main/src/objects.ts
     */
    categories: t.array(DataCategoryInput),
    /**
     * When true, this subdatapoint should be revealed in a data access request.
     * When false, this field should be redacted
     */
    'access-request-visibility-enabled': t.boolean,
    /**
     * When true, this subdatapoint should be redacted during an erasure request.
     * There normally is a choice of enabling hard deletion or redaction at the
     * datapoint level, but if redaction is enabled, this column can be used
     * to define which fields should be redacted.
     */
    'erasure-request-redaction-enabled': t.boolean,
    /** Attributes tagged to subdatapoint */
    attributes: t.array(Attributes),
  }),
]);

/** Type override */
export type FieldInput = t.TypeOf<typeof FieldInput>;

/**
 * Datapoints are the different types of data models that existing within your data silo.
 * If the data silo is a database, these would be your tables.
 * Note: These are currently called "datapoints" in the Transcend UI and documentation.
 *
 * @see https://docs.transcend.io/docs/the-data-map#datapoints
 */
export const DatapointInput = t.intersection([
  t.type({
    /** The unique key of the datapoint. For a database, this is the table name. */
    key: t.string,
  }),
  t.partial({
    /**
     * Usually only relevant for databases,
     * this field should include any schema information for a given datapoint.
     *
     * Examples:
     * - In postgres, it's possible to have multiple tables with the same name under
     * different schemas. e.g., "public", "test". So here you'd specify ["public"] or ["test"]
     * - In Snowflake, it's possible to have different databases with different schemas,
     * so you can specify ["ANALYTICS", "public"] to indicate that the datapoint belongs to
     * the "public" schema of the "ANALYTICS" database.
     */
    path: t.array(t.string),
    /** The display title of the enricher */
    title: t.string,
    /** Internal description for why the enricher is needed */
    description: t.string,
    /**
     * Configure the category of data that this datapoint should be grouped by in a data access request.
     *
     * @see https://docs.transcend.io/docs/privacy-requests/connecting-data-silos/saas-tools#configuring-an-integration
     */
    'data-collection-tag': t.string,
    /**
     * The SQL queries that should be run for that datapoint in a privacy request.
     *
     * @see https://github.com/transcend-io/privacy-types/blob/main/src/actions.ts
     */
    'privacy-action-queries': t.partial(
      applyEnum(RequestActionObjectResolver, () => t.string),
    ),
    /**
     * The types of privacy actions that this datapoint can implement
     *
     * @see https://github.com/transcend-io/privacy-types/blob/main/src/actions.ts
     */
    'privacy-actions': t.array(valuesOf(RequestActionObjectResolver)),
    /**
     * Provide field-level metadata for this datapoint.
     * This is often the column metadata
     */
    fields: t.array(FieldInput),
  }),
]);

/** Type override */
export type DatapointInput = t.TypeOf<typeof DatapointInput>;

export const PromptAVendorEmailSettings = t.partial({
  /** The email address of the user to notify when a promptAPerson integration */
  'notify-email-address': t.string,
  /**
   * The frequency with which we should be sending emails for this data silo, in milliseconds.
   */
  'send-frequency': t.number,
  /**
   * The type of emails to send for this data silo, i.e. send an email for each DSR, across all open DSRs,
   * or per profile in a DSR.
   */
  'send-type': valuesOf(PromptAVendorEmailSendType),
  /**
   * Indicates whether prompt-a-vendor emails should include a list of identifiers
   * in addition to a link to the bulk processing UI.
   */
  'include-identifiers-attachment': t.boolean,
  /**
   * Indicates what kind of link to generate as part of the emails sent out for this Prompt-a-Vendor silo.
   */
  'completion-link-type': valuesOf(PromptAVendorEmailCompletionLinkType),
  /**
   * The frequency with which we should retry sending emails for this data silo, in milliseconds.
   * Needs to be a string because the number can be larger than the MAX_INT
   */
  'manual-work-retry-frequency': t.string,
});

/** Type override */
export type PromptAVendorEmailSettings = t.TypeOf<
  typeof PromptAVendorEmailSettings
>;

/**
 * Input to define a business entity
 *
 * @see https://app.transcend.io/data-map/data-inventory/business-entities
 */
export const BusinessEntityInput = t.intersection([
  t.type({
    /** The title of the business entity */
    title: t.string,
  }),
  t.partial({
    /** Description of the business entity */
    description: t.string,
    /** Address of the business entity */
    address: t.string,
    /** Country of headquarters */
    headquarterCountry: valuesOf(IsoCountryCode),
    /** Subdivision of headquarters */
    headquarterSubDivision: valuesOf(IsoCountrySubdivisionCode),
    /** Data protection officer name for the business entity */
    dataProtectionOfficerName: t.string,
    /** Data protection officer email for the business entity */
    dataProtectionOfficerEmail: t.string,
    /**
     * Attribute value and its corresponding attribute key
     */
    attributes: t.array(Attributes),
  }),
]);

/** Type override */
export type BusinessEntityInput = t.TypeOf<typeof BusinessEntityInput>;

/**
 * Input to define a data subject
 *
 * @see https://app.transcend.io/privacy-requests/settings
 */
export const DataSubjectInput = t.intersection([
  t.type({
    /** The type of the data subject */
    type: t.string,
  }),
  t.partial({
    /** Whether the data subject is active on the Privacy Center & DSR API */
    active: t.boolean,
    /** The title of the data subject */
    title: t.string,
    /** Whether or not to default new requests made in the admin dashboard to silent mode */
    adminDashboardDefaultSilentMode: t.boolean,
    /** Enabled request actions for the data subject */
    actions: t.array(valuesOf(RequestAction)),
  }),
]);

/** Type override */
export type DataSubjectInput = t.TypeOf<typeof DataSubjectInput>;

/**
 * Input to define an action
 *
 * @see https://app.transcend.io/privacy-requests/settings
 */
export const ActionInput = t.intersection([
  t.type({
    /** The type of the data subject */
    type: valuesOf(RequestAction),
  }),
  t.partial({
    /** Whether or not to skip deletion phase when no data is found */
    skipSecondaryIfNoFiles: t.boolean,
    /** Whether to skip the downloadable step */
    skipDownloadableStep: t.boolean,
    /** Whether the request action requires review */
    requiresReview: t.boolean,
    /** The wait period for the action */
    waitingPeriod: t.number,
    /** The method in which the data subject's region is detected */
    regionDetectionMethod: valuesOf(RegionDetectionMethod),
    /** The list of regions to show in the form */
    regionList: t.array(
      valuesOf({ ...IsoCountryCode, ...IsoCountrySubdivisionCode }),
    ),
    /** The list of regions NOT to show in the form */
    regionBlockList: t.array(
      valuesOf({ ...IsoCountryCode, ...IsoCountrySubdivisionCode }),
    ),
  }),
]);

/** Type override */
export type ActionInput = t.TypeOf<typeof ActionInput>;

/**
 * Input to define an identifier
 *
 * @see https://app.transcend.io/privacy-requests/identifiers
 */
export const IdentifierInput = t.intersection([
  t.type({
    /** The name of the identifier */
    name: t.string,
    /** The type of the identifier */
    type: t.string,
  }),
  t.partial({
    /** Regular expression to verify the identifier */
    regex: t.string,
    /** The fixed set of options that an identifier can take on */
    selectOptions: t.array(t.string),
    /** Whether or not the identifier is shown in the privacy center form */
    privacyCenterVisibility: t.array(valuesOf(RequestAction)),
    /** The set of data subjects that this identifier is enabled for */
    dataSubjects: t.array(t.string),
    /** When true, the identifier is a required field on the privacy center form */
    isRequiredInForm: t.boolean,
    /** Placeholder message for identifier */
    placeholder: t.string,
    /** Display title for identifier */
    displayTitle: t.string,
    /** Display description for identifier */
    displayDescription: t.string,
  }),
]);

/** Type override */
export type IdentifierInput = t.TypeOf<typeof IdentifierInput>;

/**
 * Input to define a data flow
 *
 * @see https://app.transcend.io/consent-manager/data-flows/approved
 */
export const DataFlowInput = t.intersection([
  t.type({
    /** Value of data flow */
    value: t.string,
    /** Type of data flow */
    type: valuesOf(DataFlowScope),
  }),
  t.partial({
    /** Description of data flow */
    description: t.string,
    /** The tracking purposes that are required to be opted in for this data flow */
    trackingPurposes: t.array(t.string),
    /**
     * Name of the consent service attached
     */
    service: t.string,
    /**
     * Status of the tracker (approved vs triage)
     */
    status: valuesOf(ConsentTrackerStatus),
    /**
     * The email addresses of the employees within your company that are the go-to individuals
     * for managing this data silo
     */
    owners: t.array(t.string),
    /**
     * The names of teams within your Transcend instance that should be responsible
     * for managing this data silo.
     *
     * @see https://docs.transcend.io/docs/security/access-control#teams
     * for more information about how to create and manage teams
     */
    teams: t.array(t.string),
    /**
     * Attribute value and its corresponding attribute key
     */
    attributes: t.array(Attributes),
  }),
]);

/** Type override */
export type DataFlowInput = t.TypeOf<typeof DataFlowInput>;

export const CookieInput = t.intersection([
  t.type({
    /** Name of data flow */
    name: t.string,
  }),
  t.partial({
    /** Whether or not the cookie is a regular expression */
    isRegex: t.boolean,
    /** Description of data flow */
    description: t.string,
    /** The tracking purposes that are required to be opted in for this data flow */
    trackingPurposes: t.array(t.string),
    /**
     * Name of the consent service attached
     */
    service: t.string,
    /**
     * Status of the tracker (approved vs triage)
     */
    status: valuesOf(ConsentTrackerStatus),
    /**
     * The email addresses of the employees within your company that are the go-to individuals
     * for managing this data silo
     */
    owners: t.array(t.string),
    /**
     * The names of teams within your Transcend instance that should be responsible
     * for managing this data silo.
     *
     * @see https://docs.transcend.io/docs/security/access-control#teams
     * for more information about how to create and manage teams
     */
    teams: t.array(t.string),
    /**
     * Attribute value and its corresponding attribute key
     */
    attributes: t.array(Attributes),
  }),
]);

/** Type override */
export type CookieInput = t.TypeOf<typeof CookieInput>;

export const ConsentManageExperienceInput = t.intersection([
  t.type({
    /** Name of experience */
    name: t.string,
  }),
  t.partial({
    /** Name of experience */
    displayName: t.string,
    /** Region that define this regional experience */
    regions: t.array(
      t.partial({
        countrySubDivision: valuesOf(IsoCountrySubdivisionCode),
        country: valuesOf(IsoCountryCode),
      }),
    ),
    /** In vs not in operator */
    operator: valuesOf(RegionsOperator),
    /** Priority of experience */
    displayPriority: t.number,
    /** View state to prompt when auto prompting is enabled */
    viewState: valuesOf(InitialViewState),
    /** Purposes that can be opted out of in a particular experience */
    purposes: t.array(
      t.type({
        /** Name of purpose */
        name: t.string,
      }),
    ),
    /** Purposes that are opted out by default in a particular experience */
    optedOutPurposes: t.array(
      t.type({
        /** Name of purpose */
        name: t.string,
      }),
    ),
    /**
     * Browser languages that define this regional experience
     */
    browserLanguages: t.array(valuesOf(BrowserLanguage)),
    /** Browser time zones that define this regional experience */
    browserTimeZones: t.array(valuesOf(BrowserTimeZone)),
  }),
]);

/** Type override */
export type ConsentManageExperienceInput = t.TypeOf<
  typeof ConsentManageExperienceInput
>;

export const ConsentManagerInput = t.partial({
  /** The consent manager domains in the instance */
  bundleUrls: t.record(valuesOf(ConsentBundleType), t.string),
  /** The consent manager domains in the instance */
  domains: t.array(t.string),
  /** Key used to partition consent records */
  partition: t.string,
  /** Precedence of signals vs user input */
  consentPrecedence: valuesOf(ConsentPrecedenceOption),
  /** The consent manager unknown request policy */
  unknownRequestPolicy: valuesOf(UnknownRequestPolicy),
  /** The consent manager unknown cookie policy */
  unknownCookiePolicy: valuesOf(UnknownRequestPolicy),
  /** The XDI sync endpoint for this airgap bundle */
  syncEndpoint: t.string,
  /** The telemetry partitioning strategy */
  telemetryPartitioning: valuesOf(TelemetryPartitionStrategy),
  /** Whether the site owner has signed the IAB agreement */
  signedIabAgreement: valuesOf(SignedIabAgreementOption),
  /** Whether or not to use the US Privacy API */
  uspapi: valuesOf(UspapiOption),
  /** Regional experience configurations */
  experiences: t.array(ConsentManageExperienceInput),
  // TODO: https://transcend.height.app/T-23919 - reconsider simpler yml shape
  /** The Shared XDI host sync groups config (JSON) for this airgap bundle */
  syncGroups: t.string,
});

/** Type override */
export type ConsentManagerInput = t.TypeOf<typeof ConsentManagerInput>;

/**
 * Input to define a data silo
 *
 * Define the data silos in your data map. A data silo can be a database,
 * or a web service that may use a collection of different data stores under the hood.
 *
 * @see https://docs.transcend.io/docs/the-data-map#data-silos
 */
export const DataSiloInput = t.intersection([
  t.type({
    /** The display title of the data silo */
    title: t.string,
    /**
     * The type of integration. Common internal system types:
     * server | database | cron  | promptAPerson
     */
    integrationName: t.string,
  }),
  t.partial({
    /** For prompt a person or database integrations, the underlying integration name */
    'outer-type': t.string,
    /** A description for that data silo */
    description: t.string,
    /** The webhook URL to notify for data privacy requests */
    url: t.string,
    /** The title of the API key that will be used to respond to privacy requests */
    'api-key-title': t.string,
    /** Custom headers to include in outbound webhook */
    headers: t.array(WebhookHeader),
    /**
     * Specify which data subjects may have personally-identifiable-information (PII) within this system
     * This field can be omitted, and the default assumption will be that the system may potentially
     * contain PII for any potential data subject type.
     */
    'data-subjects': t.array(t.string),
    /**
     * When this data silo implements a privacy request, these are the identifiers
     * that should be looked up within this system.
     */
    'identity-keys': t.array(t.string),
    /**
     * When a data erasure request is being performed, this data silo should not be deleted from
     * until all of the following data silos were deleted first. This list can contain other internal
     * systems defined in this file, as well as any of the SaaS tools connected in your Transcend instance.
     */
    'deletion-dependencies': t.array(t.string),
    /**
     * The email addresses of the employees within your company that are the go-to individuals
     * for managing this data silo
     */
    owners: t.array(t.string),
    /**
     * The names of teams within your Transcend instance that should be responsible
     * for managing this data silo.
     *
     * @see https://docs.transcend.io/docs/security/access-control#teams
     * for more information about how to create and manage teams
     */
    teams: t.array(t.string),
    /**
     * Specify this flag if the data silo is under development and should not be included
     * in production privacy request workflows. Will still sync metadata to app.transcend.io.
     */
    disabled: t.boolean,
    /**
     * Datapoints defined within this data silo, see comment of `DatapointInput`
     * for further details.
     */
    datapoints: t.array(DatapointInput),
    /**
     * Configure email notification settings for privacy requests
     */
    'email-settings': PromptAVendorEmailSettings,
    /**
     * Attribute value and its corresponding attribute key
     */
    attributes: t.array(Attributes),
  }),
]);

/** Type override */
export type DataSiloInput = t.TypeOf<typeof DataSiloInput>;

export const TranscendInput = t.partial({
  /**
   * API key definitions
   */
  'api-keys': t.array(ApiKeyInput),
  /**
   * Email template definitions
   */
  templates: t.array(TemplateInput),
  /**
   * Enricher definitions
   */
  enrichers: t.array(EnricherInput),
  /**
   * Attribute definitions
   */
  attributes: t.array(AttributeInput),
  /**
   * Business entity definitions
   */
  'business-entities': t.array(BusinessEntityInput),
  /**
   * Data subject definitions
   */
  'data-subjects': t.array(DataSubjectInput),
  /**
   * Action definitions
   */
  actions: t.array(ActionInput),
  /**
   * Identifier definitions
   */
  identifiers: t.array(IdentifierInput),
  /**
   * Data silo definitions
   */
  'data-silos': t.array(DataSiloInput),
  /**
   * Data flow definitions
   */
  'data-flows': t.array(DataFlowInput),
  /**
   * Cookie definitions
   */
  cookies: t.array(CookieInput),
  /**
   * Consent manager definition
   */
  'consent-manager': ConsentManagerInput,
});

/** Type override */
export type TranscendInput = t.TypeOf<typeof TranscendInput>;

/**
 * The output of `tr-generate-api-keys` that can be provided to `tr-push`
 */
export const StoredApiKey = t.type({
  /** Name of instance */
  organizationName: t.string,
  /** API key */
  apiKey: t.string,
  /** Organization ID API key is for */
  organizationId: t.string,
});

/** Type override */
export type StoredApiKey = t.TypeOf<typeof StoredApiKey>;

/**
 * Minimal set required to mark as completed
 */
export const DataFlowCsvInput = t.intersection([
  t.type({
    /** The value of the data flow (host or regex) */
    'Connections Made To': t.string,
    /** The type of the data flow */
    Type: valuesOf(DataFlowScope),
    /** The CSV of purposes mapped to that data flow */
    Purpose: t.string,
  }),
  t.partial({
    /** The service that the data flow relates to */
    Service: t.string,
    /** Notes and descriptions for the data flow */
    Notes: t.string,
    /** Set of data flow owners */
    Owners: t.string,
    /** Set of data flow team owners */
    Teams: t.string,
    /** LIVE vs NEEDS_REVIEW aka Approved vs Triage  */
    Status: valuesOf(ConsentTrackerStatus),
  }),
  // Custom attributes
  t.record(t.string, t.string),
]);

/** Type override */
export type DataFlowCsvInput = t.TypeOf<typeof DataFlowCsvInput>;

export const CookieCsvInput = t.intersection([
  t.type({
    /** The value of the cookie */
    Name: t.string,
    /** The CSV of purposes mapped to that cookie */
    Purpose: t.string,
  }),
  t.partial({
    /** The service that the cookie relates to */
    Service: t.string,
    /** Notes and descriptions for the cookie */
    Notes: t.string,
    /** Set of cookie owners */
    Owners: t.string,
    /** Set of cookie team owners */
    Teams: t.string,
    /** LIVE vs NEEDS_REVIEW aka Approved vs Triage  */
    Status: valuesOf(ConsentTrackerStatus),
  }),
  // Custom attributes
  t.record(t.string, t.string),
]);

/** Type override */
export type CookieCsvInput = t.TypeOf<typeof CookieCsvInput>;

/**
 * Export of (await airgap.getMetadata()).services
 */
export const ConsentManagerServiceMetadata = t.type({
  /** The title of the service */
  title: t.string,
  /** The description */
  description: t.string,
  /** Cookies */
  cookies: t.array(
    t.type({
      /** Name of cookie */
      name: t.string,
      /** Allowed purposes */
      trackingPurposes: t.array(t.string),
    }),
  ),
  /** Data Flows */
  dataFlows: t.array(
    t.type({
      /** Value of data flow */
      value: t.string,
      /** Type of data flow */
      type: valuesOf(DataFlowScope),
      /** Allowed purposes */
      trackingPurposes: t.array(t.string),
    }),
  ),
});

/** Type override */
export type ConsentManagerServiceMetadata = t.TypeOf<
  typeof ConsentManagerServiceMetadata
>;
/// //////////////////////////////////////
// Pathfinder policies                  //
/// //////////////////////////////////////
export const Policy: PolicyC = t.union([
  t.literal('redactEmail'),
  t.literal('log'),
]);

/** Type override */
export type Policy = t.TypeOf<typeof Policy>;

/** the codec of the enabled policy  */
export type PolicyC = t.UnionC<[t.LiteralC<'redactEmail'>, t.LiteralC<'log'>]>;

/** the codec of a route enabled in an AI integration */
export type EnabledRouteC<T extends t.Mixed> = t.TypeC<{
  /** the name of the enabled route */
  routeName: T;
  /** the enabled policies */
  enabledPolicies: t.ArrayC<PolicyC>;
}>;

/** the codec of routes enabled in an AI integration */
export type EnabledRoutesC<T extends t.Mixed> = t.ArrayC<EnabledRouteC<T>>;

/** the codec of an AI Integration */
export type AIIntegrationC<T extends t.Mixed> = t.TypeC<{
  /** the routes enabled in the AI integration */
  enabledRoutes: EnabledRoutesC<T>;
}>;

/**
 * The names of the OpenAI routes that we support setting policies for
 * reference: https://platform.openai.com/docs/api-reference/introduction
 */
export const OpenAIRouteName = t.literal('/v1/chat/completions');

/** Type override */
export type OpenAIRouteName = t.TypeOf<typeof OpenAIRouteName>;

export const OpenAIEnabledRoute = buildEnabledRouteType({
  TRouteName: OpenAIRouteName,
});

/** Type override */
export type OpenAIEnabledRoute = t.TypeOf<typeof OpenAIEnabledRoute>;

export const OpenAIEnabledRoutes = t.array(OpenAIEnabledRoute);

  /** Type override */
  export type OpenAIEnabledRoutes = t.TypeOf<typeof OpenAIEnabledRoutes>;

export const OpenAIIntegration = buildAIIntegrationType<OpenAIRouteName, OpenAIEnabledRoutes>({
  TEnabledRoutes: OpenAIEnabledRoutes,
});

/** Type override */
export type OpenAIIntegration = t.TypeOf<typeof OpenAIIntegration>;

export const PathfinderPolicy = t.partial({
  enabledIntegrations: t.partial({
    openAI: OpenAIIntegration,
  }),
});

/** Type override */
export type PathfinderPolicy = t.TypeOf<typeof PathfinderPolicy>;
