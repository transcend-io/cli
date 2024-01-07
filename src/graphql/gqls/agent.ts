import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const AGENTS = gql`
  query TranscendCliAgents($first: Int!, $offset: Int!) {
    agents(
      first: $first
      offset: $offset
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: name, direction: ASC }
      ]
    ) {
      nodes {
        id
        name
        agentId
        description
        codeInterpreterEnabled
        retrievalEnabled
        prompt {
          title
        }
        largeLanguageModel {
          name
          client
        }
        teams {
          name
        }
        owners {
          email
        }
        agentFunctions {
          name
        }
        agentFiles {
          name
        }
      }
    }
  }
`;

export const CREATE_AGENT = gql`
  mutation TranscendCliCreateAgent($input: CreateAgentInput!) {
    createAgent(input: $input) {
      agent {
        id
        name
        agentId
      }
    }
  }
`;

export const UPDATE_AGENTS = gql`
  mutation TranscendCliUpdateAgents($input: UpdateAgentsInput!) {
    updateAgents(input: $input) {
      clientMutationId
    }
  }
`;
