import * as t from 'io-ts';
import { applyEnum, valuesOf } from '@transcend-io/type-utils';
import {
  DataCategoryType,
  ProcessingPurpose,
  RequestAction,
  RequestActionObjectResolver,
  PromptAVendorEmailSendType,
  PromptAVendorEmailCompletionLinkType,
} from '@transcend-io/privacy-types';

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
    /** The URL of the enricher */
    url: t.string,
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
    /** The privacy actions that the enricher should run against */
    'privacy-actions': t.array(valuesOf(RequestAction)),
  }),
]);

/** Type override */
export type EnricherInput = t.TypeOf<typeof EnricherInput>;

/**
 * The data category for a field
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
export const DataCategoryInput = t.type({
  /** The parent category */
  category: valuesOf(DataCategoryType),
  /** User-defined name for this sub category */
  name: t.string,
});

/** Type override */
export type DataCategoryInput = t.TypeOf<typeof DataCategoryInput>;

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
    /** The display title of the enricher */
    title: t.string,
    /** The unique key of the datapoint. When a database, this is the table name. */
    key: t.string,
  }),
  t.partial({
    /** Internal description for why the enricher is needed */
    description: t.string,
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
    /** A description for that data silo */
    description: t.string,
    /** The webhook URL to notify for data privacy requests */
    url: t.string,
    /** The title of the API key that will be used to respond to privacy requests */
    'api-key-title': t.string,
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
     * Datapoints defined within this data silo, see comment of `DatapointInput`
     * for further details.
     */
    datapoints: t.array(DatapointInput),
    'email-settings': PromptAVendorEmailSettings,
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
   * Data silo definitions
   */
  'data-silos': t.array(DataSiloInput),
});

/** Type override */
export type TranscendInput = t.TypeOf<typeof TranscendInput>;
