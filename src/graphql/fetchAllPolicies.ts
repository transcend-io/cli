import { GraphQLClient } from 'graphql-request';
import { DEPLOYED_PRIVACY_CENTER_URL, POLICIES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { LanguageKey } from '@transcend-io/internationalization';

export interface Policy {
  /** ID of policy */
  id: string;
  /** Title of policy */
  title: {
    /** Default message */
    defaultMessage: string;
  };
  /** Disabled locales */
  disabledLocales: LanguageKey[];
  /** Versions */
  versions: {
    /** Message content */
    content: {
      /** Default message */
      defaultMessage: string;
    };
  }[];
}

/**
 * Fetch all policies in the organization
 *
 * @param client - GraphQL client
 * @returns All policies in the organization
 */
export async function fetchAllPolicies(
  client: GraphQLClient,
): Promise<Policy[]> {
  const { organization } = await makeGraphQLRequest<{
    /** Organization */
    organization: {
      /** URL */
      deployedPrivacyCenterUrl: string;
    };
  }>(client, DEPLOYED_PRIVACY_CENTER_URL);

  const { privacyCenterPolicies } = await makeGraphQLRequest<{
    /** Policies */
    privacyCenterPolicies: Policy[];
  }>(client, POLICIES, {
    url: organization.deployedPrivacyCenterUrl,
  });

  return privacyCenterPolicies.sort((a, b) =>
    a.title.defaultMessage.localeCompare(b.title.defaultMessage),
  );
}
