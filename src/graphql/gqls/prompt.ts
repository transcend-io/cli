import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const PROMPTS = gql`
  query TranscendCliPrompts(
    $first: Int!
    $offset: Int!
    $filterBy: PromptFiltersInput
  ) {
    prompts(
      first: $first
      orderBy: [{ field: title, direction: ASC }]
      offset: $offset
      filterBy: $filterBy
    ) {
      nodes {
        id
        title
        status
        content
      }
    }
  }
`;

//  TODO: https://transcend.height.app/T-27909 - enable optimizations
//  isExportCsv: true
//  useMaster: false
//  TODO: https://transcend.height.app/T-27909 - order by createdAt
//  orderBy: [{ field: title, direction: ASC }]
export const PROMPT_TEMPLATES = gql`
  query TranscendCliPromptTemplates($first: Int!, $offset: Int!) {
    promptTemplates(first: $first, offset: $offset) {
      nodes {
        id
        title
        content
      }
    }
  }
`;

//  TODO: https://transcend.height.app/T-27909 - enable optimizations
//  isExportCsv: true
//  useMaster: false
//  TODO: https://transcend.height.app/T-27909 - order by createdAt
//  orderBy: [{ field: title, direction: ASC }]
export const PROMPT_PARTIALS = gql`
  query TranscendCliPromptPartials($first: Int!, $offset: Int!) {
    promptPartials(first: $first, offset: $offset) {
      nodes {
        id
        title
        content
      }
    }
  }
`;

//  TODO: https://transcend.height.app/T-27909 - enable optimizations
//  isExportCsv: true
//  useMaster: false
//  TODO: https://transcend.height.app/T-27909 - order by createdAt
//  orderBy: [{ field: title, direction: ASC }]
export const PROMPT_GROUPS = gql`
  query TranscendCliPromptGroups($first: Int!, $offset: Int!) {
    promptGroups(
      first: $first

      offset: $offset
    ) {
      nodes {
        id
        title
        description
        prompts {
          title
        }
      }
    }
  }
`;

export const PROMPTS_WITH_VARIABLES = gql`
  query TranscendCliPromptsWithVariables($input: PromptsWithVariablesInput!) {
    promptsWithVariables(input: $input) {
      prompts {
        id
        title
        content
        status
      }
      calculatedVariables {
        data
        name
      }
      runtimeVariables {
        name
        type
      }
    }
  }
`;

export const UPDATE_PROMPTS = gql`
  mutation TranscendCliUpdatePrompts($input: UpdatePromptsInput!) {
    updatePrompts(input: $input) {
      clientMutationId
    }
  }
`;

export const CREATE_PROMPT = gql`
  mutation TranscendCliCreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      clientMutationId
      prompt {
        id
      }
    }
  }
`;

export const UPDATE_PROMPT_TEMPLATES = gql`
  mutation TranscendCliUpdatePromptTemplates(
    $input: UpdatePromptTemplatesInput!
  ) {
    updatePromptTemplates(input: $input) {
      clientMutationId
    }
  }
`;

export const CREATE_PROMPT_TEMPLATE = gql`
  mutation TranscendCliCreatePromptTemplate(
    $input: CreatePromptTemplateInput!
  ) {
    createPromptTemplate(input: $input) {
      clientMutationId
      promptTemplate {
        id
      }
    }
  }
`;

export const UPDATE_PROMPT_PARTIALS = gql`
  mutation TranscendCliUpdatePromptPartials(
    $input: UpdatePromptPartialsInput!
  ) {
    updatePromptPartials(input: $input) {
      clientMutationId
    }
  }
`;

export const CREATE_PROMPT_PARTIAL = gql`
  mutation TranscendCliCreatePromptPartial($input: CreatePromptPartialInput!) {
    createPromptPartial(input: $input) {
      clientMutationId
      promptPartial {
        id
      }
    }
  }
`;

export const UPDATE_PROMPT_GROUPS = gql`
  mutation TranscendCliUpdatePromptGroups($input: UpdatePromptGroupsInput!) {
    updatePromptGroups(input: $input) {
      clientMutationId
    }
  }
`;

export const CREATE_PROMPT_GROUP = gql`
  mutation TranscendCliCreatePromptPartial($input: CreatePromptGroupInput!) {
    createPromptGroup(input: $input) {
      clientMutationId
      promptGroup {
        id
      }
    }
  }
`;
