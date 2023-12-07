import { makeEnum } from '@transcend-io/type-utils';

/**
 * Resources that can be pulled in
 */
export enum TranscendPullResource {
  ApiKeys = 'apiKeys',
  AssessmentTemplate = 'assessmentTemplate',
  Assessment = 'assessment',
  Attributes = 'attributes',
  Templates = 'templates',
  DataSilos = 'dataSilos',
  Enrichers = 'enrichers',
  DataFlows = 'dataFlows',
  BusinessEntities = 'businessEntities',
  Actions = 'actions',
  DataSubjects = 'dataSubjects',
  Identifiers = 'identifiers',
  Cookies = 'cookies',
  ConsentManager = 'consentManager',
  Prompts = 'prompts',
  PromptPartials = 'promptPartials',
  PromptGroups = 'promptGroups',
}

/**
 * Names of built in policies for pathfinder
 */
export const PathfinderPolicyName = makeEnum({
  RedactEmail: 'redactEmail',
  Log: 'log',
  LogToTranscend: 'logToTranscend',
  ApplyTranscendPolicies: 'applyTranscendPolicies',
});

/**
 * Type override
 */
export type PathfinderPolicyName =
  typeof PathfinderPolicyName[keyof typeof PathfinderPolicyName];

/**
 * The names of the OpenAI routes that we support setting policies for
 * reference: https://platform.openai.com/docs/api-reference/introduction
 */
export const OpenAIRouteName = makeEnum({
  ChatCompletion: '/v1/chat/completions',
  Embeddings: '/v1/embeddings',
  Completions: '/v1/completions',
});

/**
 * Type override
 */
export type OpenAIRouteName =
  typeof OpenAIRouteName[keyof typeof OpenAIRouteName];
