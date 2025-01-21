import * as t from 'io-ts';
import { Got } from 'got';
import { decodeCodec } from '@transcend-io/type-utils';

/**
 * FIXME: move to privacy-types
 */

// Nested types first
const OneTrustUserMetadata = t.type({
  /** When the user was created */
  created: t.string,
  /** When the user was modified */
  lastModified: t.string,
  /** The URI for accessing information about the user */
  location: t.string,
  /** The resource type */
  resourceType: t.literal('User'),
});
/** Type override */
export type OneTrustUserMetadata = t.TypeOf<typeof OneTrustUserMetadata>;

const OneTrustUserName = t.type({
  /** The user's family name */
  familyName: t.string,
  /** The user's given name */
  givenName: t.string,
});
/** Type override */
export type OneTrustUserName = t.TypeOf<typeof OneTrustUserName>;

const OneTrustUserGroup = t.type({
  /** The user group's identification */
  value: t.string,
  /** The user group's display name */
  display: t.string,
});
/** Type override */
export type OneTrustUserGroup = t.TypeOf<typeof OneTrustUserGroup>;

const OneTrustUserGroups = t.array(OneTrustUserGroup);
/** Type override */
export type OneTrustUserGroups = t.TypeOf<typeof OneTrustUserGroups>;

const OneTrustUserEmail = t.type({
  /** The email value */
  value: t.string,
  /** The email display name */
  display: t.string,
  /** Whether this is the primary email */
  primary: t.boolean,
  /** The email type */
  type: t.union([t.string, t.literal('work')]),
});
/** Type override */
export type OneTrustUserEmail = t.TypeOf<typeof OneTrustUserEmail>;

const OneTrustUserEmails = t.array(OneTrustUserEmail);
/** Type override */
export type OneTrustUserEmails = t.TypeOf<typeof OneTrustUserEmails>;

/**
 * The response type of the OneTrust GetUser endpoint
 * ref: https://developer.onetrust.com/onetrust/reference/getriskusingget
 */
export const OneTrustGetUserResponse = t.type({
  /** ID of the user. */
  id: t.string,
  /** External ID of the user. */
  externalId: t.union([t.string, t.null]),
  /** Metadata of the user. */
  meta: OneTrustUserMetadata,
  /** Schemas of the user */
  schemas: t.array(t.string),
  /** Name or email of the user */
  userName: t.string,
  /** Full name of the user */
  name: OneTrustUserName,
  /** Type of the user */
  userType: t.union([t.string, t.literal('Internal')]),
  /** Flag to check if the user is an active user or not. */
  active: t.boolean,
  /** The groups that the user belongs to */
  groups: OneTrustUserGroups,
  /** The emails of the user */
  emails: OneTrustUserEmails,
  /** The roles of the user */
  roles: t.array(t.string),
  /** The title of the user */
  title: t.union([t.string, t.null]),
});

/** Type override */

/** Type override */
export type OneTrustGetUserResponse = t.TypeOf<typeof OneTrustGetUserResponse>;

/**
 * Retrieve details about a particular user.
 * ref: https://developer.onetrust.com/onetrust/reference/getriskusingget
 *
 * @param param - the information about the OneTrust client and risk to retrieve
 * @returns the OneTrust risk
 */
export const getOneTrustUser = async ({
  oneTrust,
  creatorId,
}: {
  /** The OneTrust client instance */
  oneTrust: Got;
  /** The ID of the OneTrust user to retrieve */
  creatorId: string;
}): Promise<OneTrustGetUserResponse> => {
  const { body } = await oneTrust.get(`api/scim/v2/Users/${creatorId}`);

  return decodeCodec(OneTrustGetUserResponse, body);
};
