import { GraphQLClient } from 'graphql-request';
import { GLOBAL_ACTION_ITEMS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  ActionItemCode,
  ActionItemPriorityOverride,
} from '@transcend-io/privacy-types';

export interface ActionItem {
  /** ID of action item */
  ids: string[];
  /** Count of action items */
  count: number;
  /** Teams assigned to action items */
  teams: {
    /** ID of team */
    id: string;
    /** Name of team */
    name: string;
  }[];
  /** Users assigned to the action item */
  users: {
    /** ID of user */
    id: string;
    /** User email */
    email: string;
  }[];
  /** Due date of action item */
  dueDate?: string;
  /** Priority of action item */
  priority?: ActionItemPriorityOverride;
  /** Titles of action items */
  titles: string[];
  /** Description of the action item */
  resolved: boolean;
  /** Notes */
  notes: string[];
  /** links */
  links: string[];
  /** Action item types */
  type: ActionItemCode;
  /** Custom fields */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key that the value represents */
    attributeKey: {
      /** Name of attribute team */
      name: string;
    };
  }[];
  /** Additional context related to action item */
  additionalContexts?: {
    /** Override of icon */
    iconOverride?: string;
    /** Request ID */
    requestId?: string;
    /** Data Silo ID */
    dataSiloId?: string;
    /** Request type */
    requestType?: string;
    /** Airgap version */
    latestAirgapVersion?: string;
    /** Parent title */
    parentTitle?: string;
  };
}

const PAGE_SIZE = 20;

/**
 * Fetch all action items in the organization
 *
 * @param client - GraphQL client
 * @param filterBy - Filter by
 * @returns All action items in the organization
 */
export async function fetchAllActionItems(
  client: GraphQLClient,
  filterBy: {
    /** Names of the action items to filter for */
    priority?: ActionItemPriorityOverride[];
    /** Type of action item */
    type?: ActionItemCode[];
    /** Whether resolved or not */
    resolved?: boolean;
    /** Filter for action items due before this date */
    startDueDate?: Date;
    /** Filter for action items due after this date */
    endDueDate?: Date;
  } = {},
): Promise<ActionItem[]> {
  const actionItems: ActionItem[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      actionItems: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** ActionItems */
      actionItems: {
        /** List */
        nodes: ActionItem[];
      };
    }>(client, GLOBAL_ACTION_ITEMS, {
      first: PAGE_SIZE,
      offset,
      filterBy: {
        ...filterBy,
        ...(filterBy.startDueDate
          ? { startDueDate: filterBy.startDueDate.toISOString() }
          : {}),
        ...(filterBy.endDueDate
          ? { endDueDate: filterBy.endDueDate.toISOString() }
          : {}),
      },
    });
    actionItems.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return actionItems;
}
