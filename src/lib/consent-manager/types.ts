import * as t from 'io-ts';

export const ConsentPreferenceUpload = t.intersection([
  t.type({
    /** User ID */
    userId: t.string,
    /** Has the consent been updated (including no-change confirmation) since default resolution */
    timestamp: t.string,
  }),
  t.partial({
    /** Was tracking consent confirmed by the user? If this is false, the consent was resolved from defaults & is not yet confirmed */
    confirmed: t.union([t.literal('true'), t.literal('false')]),
    /**
     * Has the consent been updated (including no-change confirmation) since default resolution
     */
    updated: t.union([t.literal('true'), t.literal('false')]),
    /**
     * Whether or not the UI has been shown to the end-user (undefined in older versions of airgap.js)
     */
    prompted: t.union([t.literal('true'), t.literal('false')]),
    /** Consent metadata */
    metadata: t.string,
    /** US Privacy (USP) String */
    usp: t.union([t.string, t.null]),
    /** IAB GPP String */
    gpp: t.union([t.string, t.null]),
    /**
     * Purpose map
     * This is a stringified JSON object with keys as purpose names and values as booleans or 'Auto'
     */
    purposes: t.string,
  }),
]);

/** Type override */
export type ConsentPreferenceUpload = t.TypeOf<typeof ConsentPreferenceUpload>;
