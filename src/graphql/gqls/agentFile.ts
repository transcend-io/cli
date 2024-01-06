import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const AGENT_FILES = gql`
  query TranscendCliAgentFiles($first: Int!, $offset: Int!) {
    agentFiles(
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
        fileId
        size
        purpose
      }
    }
  }
`;

export const CREATE_AGENT_FILE = gql`
  mutation TranscendCliCreateAgentFile($input: CreateAgentFileInput!) {
    createAgentFile(input: $input) {
      agentFile {
        id
        name
        fileId
      }
    }
  }
`;

export const UPDATE_AGENT_FILES = gql`
  mutation TranscendCliUpdateAgentFiles($input: UpdateAgentFilesInput!) {
    updateAgentFiles(input: $input) {
      clientMutationId
    }
  }
`;
