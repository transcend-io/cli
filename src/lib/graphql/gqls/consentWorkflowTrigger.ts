import { gql } from 'graphql-request';

export const CONSENT_WORKFLOW_TRIGGERS = gql`
  query TranscendCliConsentWorkflowTriggers($first: Int!, $offset: Int!) {
    consentWorkflowTriggers(first: $first, offset: $offset) {
      nodes {
        id
        name
        triggerCondition
        isSilent
        allowUnauthenticated
        isActive
        workflowConfigId
        action {
          type
        }
        subject {
          type
        }
        dataSilos {
          title
        }
      }
      totalCount
    }
  }
`;

export const CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER = gql`
  mutation TranscendCliCreateOrUpdateConsentWorkflowTrigger(
    $input: CreateOrUpdateConsentWorkflowTriggerInput!
  ) {
    createOrUpdateConsentWorkflowTrigger(input: $input) {
      consentWorkflowTrigger {
        id
        name
      }
    }
  }
`;

export const DELETE_CONSENT_WORKFLOW_TRIGGERS = gql`
  mutation TranscendCliDeleteConsentWorkflowTriggers($ids: [ID!]!) {
    deleteConsentWorkflowTriggers(ids: $ids) {
      clientMutationId
    }
  }
`;
