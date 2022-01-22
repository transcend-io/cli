import * as t from 'io-ts';

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
     * The name of the identifier that will be the input to this enricher.
     * Whenever a privacy request contains this identifier, the webhook will
     * be called with the value of that identifier as input
     */
    'input-identifier': t.string,
    /**
     * The names of the identifiers that can be resolved by this enricher.
     * i.e. email -> [userId, phone, advertisingId]
     */
    'output-identifiers': t.array(t.string),
  }),
  t.partial({
    /** Internal description for why the enricher is needed */
    description: t.string,
  }),
]);

/** Type override */
export type EnricherInput = t.TypeOf<typeof EnricherInput>;

/**
 * Objects are the different types of data models that existing within your data silo.
 * If the data silo is a database, these would be your tables.
 * Note: These are currently called "datapoints" in the Transcend UI and documentation.
 *
 * @see https://docs.transcend.io/docs/the-data-map#datapoints
 */
export const ObjectInput = t.intersection([
  t.type({
    /** The display title of the enricher */
    title: t.string,
  }),
  t.partial({
    /** Internal description for why the enricher is needed */
    description: t.string,
    /** The unique key of the object. When a database, this is the table name. */
    key: t.string,
  }),
]);

/** Type override */
export type ObjectInput = t.TypeOf<typeof ObjectInput>;

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
  }),
  t.partial({
    /** A description for that data silo */
    description: t.string,
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
     * Specify this flag if the data silo is under development and should not be included
     * in production privacy request workflows. Will still sync metadata to app.transcend.io.
     */
    disabled: t.boolean,
    /**
     * Objects defined within this data silo, see comment of `ObjectInput`
     * for further details.
     */
    objects: t.array(ObjectInput),
  }),
]);

/** Type override */
export type DataSiloInput = t.TypeOf<typeof DataSiloInput>;

//         # What is the purpose of processing for this object/table?
//         #   ESSENTIAL: Provide a service that the user explicitly requests and that is part of the product's basic service or functionality
//         #   ADDITIONAL_FUNCTIONALITY: Provide a service that the user explicitly requests but that is not a necessary part of the product's basic service
//         #   ADVERTISING: To show ads that are either targeted to the specific user or not targeted
//         #   MARKETING: To contact the user to offer products, services, or other promotions
//         #   ANALYTICS: For understanding the product’s audience, improving the product, inform company strategy, or general research
//         #   PERSONALIZATION: For providing user with a personalized experience
//         #   OPERATION_SECURITY: For product operation and security, enforcement of terms of service, fraud prevention, protecting users and property, etc.
//         #   LEGAL: For compliance with legal obligations
//         #   TRANSFER: For data that was transferred as part of a change in circumstance (e.g. a merger or acquisition)
//         #   SALE: For selling the data to third parties
//         #   HR: For personnel training, recruitment, payroll, management, etc.
//         #   OTHER: Other specific purpose not covered above
//         #   UNSPECIFIED: The purpose is not explicitly stated or is unclear
//         purpose: ESSENTIAL
//         # The category of personal data for this object
//         #   FINANCIAL: Financial information
//         #   HEALTH: Health information
//         #   CONTACT: Contact information
//         #   LOCATION: Geo-location information
//         #   DEMOGRAPHIC: Demographic Information
//         #   ID: Identifiers that uniquely identify a person
//         #   ONLINE_ACTIVITY: The user's online activities on the first party website/app or other websites/apps
//         #   USER_PROFILE: The user’s profile on the first-party website/app and its contents
//         #   SOCIAL_MEDIA: User profile and data from a social media website/app or other third party service
//         #   CONNECTION: Connection information for the current browsing session, e.g. device IDs, MAC addresses, IP addresses, etc.
//         #   TRACKING: Cookies and tracking elements
//         #   DEVICE: Computer or device information
//         #   SURVEY: Any data that is collected through surveys
//         #   OTHER: A specific type of information not covered by the above categories
//         #   UNSPECIFIED: The type of information is not explicitly stated or unclear
//         category: USER_PROFILE
//         # The types of privacy actions that this object can implement
//         #   AUTOMATED_DECISION_MAKING_OPT_OUT: Opt out of automated decision making
//         #   CONTACT_OPT_OUT: Opt out of all communication
//         #   SALE_OPT_OUT: Opt-out of the sale of personal data
//         #   TRACKING_OPT_OUT: Opt out of tracking
//         #   ACCESS: Data Download request
//         #   ERASURE: Erase the profile from the system
//         #   ACCOUNT_DELETION: Run an account deletion instead of a fully compliant deletion
//         #   RECTIFICATION: Make an update to an inaccurate record
//         #   RESTRICTION: Restrict processing
//         #   DATA_CHECK: Check for data (after an erasure request)
//         privacy-actions:
//           - ACCESS
//           - ERASURE
//           - CONTACT_OPT_OUT
//         # Provide field-level metadata for this object.
//         fields:
//           - key: firstName
//             title: First Name
//             description: The first name of the user, inputted during onboarding
//           - key: email
//             title: Email
//             description: The email address of the user

export const TranscendInput = t.partial({
  /**
   * Enricher definitions
   */
  enrichers: t.array(EnricherInput),
  /**
   * Data silo definitions
   */
  'data-silos': t.array(DataSiloInput),
});

/** Type override */
export type TranscendInput = t.TypeOf<typeof TranscendInput>;
