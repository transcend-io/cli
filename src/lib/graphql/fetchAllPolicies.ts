import { LanguageKey } from '@transcend-io/internationalization';
import { GraphQLClient } from 'graphql-request';
import { fetchPrivacyCenterUrl } from './fetchPrivacyCenterId';
import { POLICIES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

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
  const deployedPrivacyCenterUrl = await fetchPrivacyCenterUrl(client);
  const { privacyCenterPolicies } = await makeGraphQLRequest<{
    /** Policies */
    privacyCenterPolicies: Policy[];
  }>(client, POLICIES, {
    url: deployedPrivacyCenterUrl,
  });

  return privacyCenterPolicies.sort((a, b) =>
    a.title.defaultMessage.localeCompare(b.title.defaultMessage),
  );
}
