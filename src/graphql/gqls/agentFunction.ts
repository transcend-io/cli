import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const AGENT_FUNCTIONS = gql`
  query TranscendCliAgentFunctions($first: Int!, $offset: Int!) {
    agentFunctions(
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
        parameters
      }
    }
  }
`;

export const CREATE_AGENT_FUNCTION = gql`
  mutation TranscendCliCreateAgentFunction($input: AgentFunctionInput!) {
    createAgentFunction(input: $input) {
      agentFunction {
        id
      }
    }
  }
`;

export const UPDATE_AGENT_FUNCTIONS = gql`
  mutation TranscendCliUpdateAgentFunctions(
    $input: UpdateAgentFunctionsInput!
  ) {
    updateAgentFunctions(input: $input) {
      clientMutationId
    }
  }
`;
