import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const AGENTS = gql`
  query TranscendCliAgents($first: Int!, $offset: Int!) {
    vendors(
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
        team {
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
  mutation TranscendCliCreateAgent($input: AgentInput!) {
    createAgent(input: $input) {
      vendor {
        id
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
