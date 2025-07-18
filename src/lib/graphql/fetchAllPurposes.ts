import { UserPrivacySignalEnum } from '@transcend-io/airgap.js-types';
import {
  DefaultConsentOption,
  PreferenceStoreAuthLevel,
} from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import { PURPOSES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Purpose {
  /** ID of purpose */
  id: string;
  /** Name of purpose */
  name: string;
  /** Description of purpose */
  description: string;
  /** Default consent status */
  defaultConsent: DefaultConsentOption;
  /** Slug of purpose */
  trackingType: string;
  /** Whether the purpose is configurable */
  configurable: boolean;
  /** Whether the purpose is essential */
  essential: boolean;
  /** Whether to show the purpose in the consent manager */
  showInConsentManager: boolean;
  /** Whether the purpose is active */
  isActive: boolean;
  /** Display order of the purpose */
  displayOrder: number;
  /** Opt-out signals for the purpose */
  optOutSignals: UserPrivacySignalEnum[];
  /** Whether the purpose is deleted */
  deletedAt?: string;
  /** Authorization level required for the purpose */
  authLevel: PreferenceStoreAuthLevel;
  /** Whether to show the purpose in the privacy center */
  showInPrivacyCenter: boolean;
  /** Title of the purpose */
  title: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all purposes in the organization
 *
 * @param client - GraphQL client
 * @param input - Input
 * @returns All purposes in the organization
 */
export async function fetchAllPurposes(
  client: GraphQLClient,
  {
    includeDeleted = false,
  }: {
    /** Whether to include deleted purposes */
    includeDeleted?: boolean;
  } = {},
): Promise<Purpose[]> {
  const purposes: Purpose[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      purposes: { nodes },
    } = await makeGraphQLRequest<{
      /** Purposes */
      purposes: {
        /** List */
        nodes: Purpose[];
      };
    }>(client, PURPOSES, {
      first: PAGE_SIZE,
      offset,
      input: {
        includeDeleted,
      },
    });
    purposes.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return purposes.sort((a, b) => a.trackingType.localeCompare(b.trackingType));
}
