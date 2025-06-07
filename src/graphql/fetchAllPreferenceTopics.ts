import { GraphQLClient } from 'graphql-request';
import { PREFERENCE_TOPICS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { PreferenceTopicType } from '@transcend-io/privacy-types';

export interface PreferenceTopic {
  /** ID of preference topic */
  id: string;
  /** Slug of preference topic */
  slug: string;
  /** Title of topic */
  title: {
    /** ID */
    id: string;
    /** Default message */
    defaultMessage: string;
  };
  /** Whether to show in privacy center */
  showInPrivacyCenter: boolean;
  /** Description to display in privacy center */
  displayDescription: {
    /** ID */
    id: string;
    /** Default message */
    defaultMessage: string;
  };
  /** Type of preference topic */
  type: PreferenceTopicType;
  /** Default configuration */
  defaultConfiguration: string;
  /** Option values */
  preferenceOptionValues: {
    /** Slug of value */
    slug: string;
    /** Title of value */
    title: {
      /** ID */
      id: string;
      /** Default message */
      defaultMessage: string;
    };
  }[];
  /** Related purpose */
  purpose: {
    /** Slug */
    trackingType: string;
  };
}

const PAGE_SIZE = 20;

/**
 * Fetch all preference topics in the organization
 *
 * @param client - GraphQL client
 * @returns All preference topics in the organization
 */
export async function fetchAllPreferenceTopics(
  client: GraphQLClient,
): Promise<PreferenceTopic[]> {
  const preferenceTopics: PreferenceTopic[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      preferenceTopics: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Preference topics */
      preferenceTopics: {
        /** List */
        nodes: PreferenceTopic[];
      };
    }>(client, PREFERENCE_TOPICS, {
      first: PAGE_SIZE,
      offset,
    });
    preferenceTopics.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return preferenceTopics.sort((a, b) =>
    `${a.slug}:${a.purpose.trackingType}`.localeCompare(
      `${b.slug}:${b.purpose.trackingType}`,
    ),
  );
}
