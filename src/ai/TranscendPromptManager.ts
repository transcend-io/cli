import { apply, decodeCodec, getValues } from '@transcend-io/type-utils';
import type { Handlebars } from '@transcend-io/handlebars-utils';
import { Secret } from '@transcend-io/secret-value';
import * as t from 'io-ts';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { buildTranscendGraphQLClient } from '../graphql';
import {
  HandlebarsInput,
  createHandlebarsWithHelpers,
} from '@transcend-io/handlebars-utils';
import {
  TranscendPromptTemplated,
  TranscendPromptsAndVariables,
  fetchPromptsWithVariables,
} from '../graphql/fetchPrompts';
import { GraphQLClient } from 'graphql-request';
import keyBy from 'lodash/keyBy';
import { AssessmentStatus } from '@transcend-io/privacy-types';

/**
 * An LLM Prompt definition
 */
export type TranscendPrompt<
  TInputParams extends t.Any,
  TOutputCodec extends t.Any,
> = (
  | {
      /** ID of the prompt */
      id: string;
      /** Title of the prompt  */
      title?: string;
    }
  | {
      /** ID of the prompt */
      id?: string;
      /** Title of the prompt  */
      title: string;
    }
) & {
  /** Codec to validate runtime input shape */
  paramCodec: TInputParams;
  /** Codec to validate output response */
  outputCodec: TOutputCodec;
  /**
   * If the output that needs to be parsed is returned within a tag
   * e.g. <tag> or <json> - this is the name of the tag
   */
  extractFromTag?: string;
};

/**
 * Create a regex to extract data from a tag
 *
 * Input:
 * "here is some data <tag>Data</tag>..."
 *
 * @param tagName - Name of tag
 * @returns Data within the tag
 */
export function createRegexForTag(tagName: string): RegExp {
  return new RegExp(`<${tagName}>([\\s\\S]+?)<\\/${tagName}>`);
}

/**
 * Helper function to declare prompts
 *
 * @param prompts - Prompt config
 * @returns Prompts as identity function - but type enforced
 */
export function defineTranscendPrompts<
  TPromptNames extends string,
  TPrompts extends { [k in TPromptNames]: TranscendPrompt<t.Any, t.Any> },
>(prompts: TPrompts): TPrompts {
  return prompts;
}

/**
 * A class that is capable of loading and insert variables into prompts from
 * Transcend's Prompt Manager
 */
export class TranscendPromptManager<
  TPromptNames extends string,
  TPrompts extends { [k in TPromptNames]: TranscendPrompt<t.Any, t.Any> },
> {
  /** Prompt definitions */
  public prompts: TPrompts;

  /** Options for configuring handlebars */
  public handlebarsOptions!: HandlebarsInput;

  /** Prompt name -> content map, populated by call to Transcend API */
  public promptContentMap?: { [k in TPromptNames]: TranscendPromptTemplated };

  /** The GraphQL client that can be used to call Transcend */
  public graphQLClient: GraphQLClient;

  /** The set of variables to expose in handlebars context specified at class initiation */
  public defaultVariables: { [k in string]: unknown };

  /**
   * The set of variables to expose in handlebars context,
   * merges defaults with calculated variables from the inventory
   */
  public variables: { [k in string]: unknown };

  /** Handlebars compiler */
  public handlebars: typeof Handlebars;

  /** The Transcend API key */
  public transcendApiKey: string | Secret<string>;

  /** API of Transcend to call */
  public transcendUrl: string;

  /** When true, throw an error if the prompt is not approved */
  public requireApproval: boolean;

  /**
   * The cache duration in ms for how long prompts and associated metadata should be cached
   * When undefined - prompts are cached indefinitely unless explicitly re-requested
   * When 0, prompts and metadata are fetched every time (not recommended)
   * Setting this to be an hour is a good rate that optimizes for performance and keeping up to date
   */
  public cacheDuration?: number;

  /**
   * The last time the metadata was fetched
   */
  public lastUpdatedAt?: Date;

  /**
   * Constructor
   *
   * @param options - Options
   */
  constructor({
    prompts,
    handlebarsOptions = {},
    transcendUrl = DEFAULT_TRANSCEND_API,
    transcendApiKey,
    requireApproval = true,
    cacheDuration,
    defaultVariables = {},
  }: {
    /** Prompt definitions to load */
    prompts: TPrompts;
    /** Options for configuring handlebars */
    handlebarsOptions?: HandlebarsInput;
    /** The Transcend API key */
    transcendApiKey: string | Secret<string>;
    /** API of Transcend to call */
    transcendUrl?: string;
    /** When true, throw an error if the prompt is not approved */
    requireApproval?: boolean;
    /** The set of variables to expose in handlebars context specified at class initiation */
    defaultVariables?: { [k in string]: unknown };
    /**
     * The cache duration in ms for how long prompts and associated metadata should be cached
     * When undefined - prompts are cached indefinitely unless explicitly re-requested
     * When 0, prompts and metadata are fetched every time (not recommended)
     * Setting this to be an hour is a good rate that optimizes for performance and keeping up to date
     */
    cacheDuration?: number;
  }) {
    this.prompts = prompts;
    this.transcendUrl = transcendUrl;
    this.transcendApiKey = transcendApiKey;
    this.variables = defaultVariables;
    this.defaultVariables = defaultVariables;
    this.graphQLClient = buildTranscendGraphQLClient(
      transcendUrl,
      typeof transcendApiKey === 'object'
        ? transcendApiKey.release()
        : transcendApiKey,
    );
    this.requireApproval = requireApproval;
    this.cacheDuration = cacheDuration;
    this.handlebarsOptions = handlebarsOptions;
    this.handlebars = createHandlebarsWithHelpers(handlebarsOptions);
  }

  /**
   * Fetch prompt metadata from Transcend and cache to the class definition
   *
   * @returns A function that can be used to call the prompt
   */
  async fetchPromptsAndMetadata(): Promise<TranscendPromptsAndVariables> {
    // Determine what to fetch
    const promptDefinitions = getValues(this.prompts) as TranscendPrompt<
      t.Any,
      t.Any
    >[];
    const promptIds = promptDefinitions
      .map(({ id }) => id)
      .filter((x): x is string => !!x);
    const promptTitles = promptDefinitions
      .map(({ title }) => title)
      .filter((x): x is string => !!x);

    // Fetch prompts and data
    const response = await fetchPromptsWithVariables(this.graphQLClient, {
      promptIds,
      promptTitles,
    });

    // Lookup prompts by id/title
    const promptByTitle = keyBy(response.prompts, 'title');
    const promptById = keyBy(response.prompts, 'id');

    // Update variables
    this.variables = {
      ...response.calculatedVariables.reduce(
        (acc, v) =>
          Object.assign(acc, {
            [v.name]: v.data ? JSON.parse(v.data) : v.data,
          }),
        {},
      ),
      ...this.defaultVariables,
    };

    // Update partials
    this.handlebars = createHandlebarsWithHelpers({
      ...this.handlebarsOptions,
      templates: [
        ...(this.handlebarsOptions.templates || []),
        ...response.promptPartials.map((partial) => ({
          name: partial.title,
          content: partial.content,
        })),
      ],
    });

    // Create mapping from prompt to content
    this.promptContentMap = apply(this.prompts, ({ id, title }) => {
      const result = id
        ? promptById[id]
        : title
        ? promptByTitle[title]
        : undefined;
      if (!result) {
        throw new Error(
          `Failed to find prompt with title: "${title}" and id: "${id}"`,
        );
      }
      return result;
    });

    // For cache
    this.lastUpdatedAt = new Date();

    return response;
  }

  /**
   * Validate the shape of the response from AI
   *
   * @param promptName - Prompt to compile
   * @param params - Runtime parameters
   * @returns Parsed content
   */
  async compilePrompt<TPromptName extends TPromptNames>(
    promptName: TPromptName,
    params: t.TypeOf<TPrompts[TPromptName]['paramCodec']>,
  ): Promise<string> {
    // Determine if prompts need to be fetched
    if (
      // never been fetched
      !this.lastUpdatedAt ||
      // fetch every run
      this.cacheDuration === 0 ||
      // If cache duration met
      (this.cacheDuration &&
        Date.now() - this.lastUpdatedAt.getTime() > this.cacheDuration)
    ) {
      await this.fetchPromptsAndMetadata();
    }

    // Lookup prompt
    const { promptContentMap } = this;
    if (!promptContentMap) {
      throw new Error('Expected this.promptContentMap to be defined');
    }
    const promptTemplate = promptContentMap[promptName];
    if (!promptContentMap) {
      throw new Error(
        `Expected this.promptContentMap[${promptName}] to be defined`,
      );
    }
    const promptInput = this.prompts[promptName];
    if (!promptInput) {
      throw new Error(`Expected this.prompts[${promptName}] to be defined`);
    }

    // Ensure prompt is approved
    if (
      this.requireApproval &&
      promptTemplate.status !== AssessmentStatus.Approved
    ) {
      throw new Error(
        `Assessment "${promptTemplate.title}" cannot be used because its in status: "${promptTemplate.status}"`,
      );
    }

    // If prompt is rejected, throw error
    if (promptTemplate.status === AssessmentStatus.Rejected) {
      throw new Error(
        `Assessment "${promptTemplate.title}" cannot be used because it's in status: "${promptTemplate.status}"`,
      );
    }

    // Validate params
    decodeCodec(promptInput.paramCodec, params);

    // Compile prompt and template
    return this.handlebars.compile(promptTemplate.content)({
      // template in currentDate by default
      currentDate: new Date().toISOString(),
      ...this.variables,
      ...params,
    });
  }

  /**
   * Validate the shape of the response from AI
   *
   * @param promptName - Prompt to parse
   * @param response - AI response as string
   * @returns Parsed content
   */
  parseAiResponse<TPromptName extends TPromptNames>(
    promptName: TPromptName,
    response: string,
  ): t.TypeOf<TPrompts[TPromptName]['outputCodec']> {
    // Look up prompt info
    const promptInput = this.prompts[promptName];
    if (!promptInput) {
      throw new Error(`Expected this.prompts[${promptName}] to be defined`);
    }

    // Extract from tag if needed
    const extracted = promptInput.extractFromTag
      ? (createRegexForTag(promptInput.extractFromTag).exec(response) ||
          [])[1] || response
      : response;

    // Parse via codec
    return decodeCodec(promptInput.outputCodec, extracted);
  }
}
