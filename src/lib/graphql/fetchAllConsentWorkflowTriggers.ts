import { GraphQLClient } from 'graphql-request';
import { CONSENT_WORKFLOW_TRIGGERS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface ConsentWorkflowTriggerPurpose {
  /** Whether this purpose must match opted-in (true) or opted-out (false) */
  matchingState: boolean;
  /** The associated purpose */
  purpose: {
    /** Slug of purpose */
    trackingType: string;
  };
}

export interface ConsentWorkflowTrigger {
  /** ID of the trigger */
  id: string;
  /** Name of the trigger */
  name: string;
  /** JSON string of the trigger condition */
  triggerCondition: string | null;
  /** Whether the trigger runs silently */
  isSilent: boolean;
  /** Whether unauthenticated requests are allowed */
  allowUnauthenticated: boolean;
  /** Whether the trigger is active */
  isActive: boolean;
  /** The workflow config ID */
  workflowConfigId: string | null;
  /** The request action associated with the trigger */
  action: {
    /** Action type (e.g. ERASURE, ACCESS) */
    type: string;
  };
  /** The data subject associated with the trigger */
  subject: {
    /** Data subject type */
    type: string;
  };
  /** Data silos associated with this trigger */
  dataSilos: {
    /** Title of data silo */
    title: string;
  }[];
  /** Purposes and their matching consent states */
  consentWorkflowTriggerPurposes: ConsentWorkflowTriggerPurpose[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all consent workflow triggers in the organization
 *
 * @param client - GraphQL client
 * @returns All consent workflow triggers in the organization
 */
export async function fetchAllConsentWorkflowTriggers(
  client: GraphQLClient,
): Promise<ConsentWorkflowTrigger[]> {
  const triggers: ConsentWorkflowTrigger[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      consentWorkflowTriggers: { nodes },
    } = await makeGraphQLRequest<{
      /** Consent workflow triggers */
      consentWorkflowTriggers: {
        /** List */
        nodes: ConsentWorkflowTrigger[];
      };
    }>(client, CONSENT_WORKFLOW_TRIGGERS, {
      first: PAGE_SIZE,
      offset,
    });
    triggers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return triggers.sort((a, b) => a.name.localeCompare(b.name));
}
