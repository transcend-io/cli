import { ObjByString, decodeCodec } from '@transcend-io/type-utils';
import type handlebars from 'handlebars';
import { AssessmentStatus } from '@transcend-io/privacy-types';
import { Secret } from '@transcend-io/secret-value';
import * as t from 'io-ts';
import { fetchAllAssessments } from '../graphql/fetchAssessments';
import { DEFAULT_TRANSCEND_API } from '../constants';
import {
  buildTranscendGraphQLClient,
  fetchAllAttributes,
  fetchAllBusinessEntities,
} from '../graphql';
import { getVariablesFromHandlebarsTemplate } from '../helpers/getVariablesFromHandlebarsTemplate';
import {
  HandlebarsInput,
  createHandlebarsWithHelpers,
} from './createHandlebarsWithHelpers';
import camelCase from 'lodash/camelCase';
import keyBy from 'lodash/keyBy';

export const EXPECTED_ATTRIBUTE_PREFIX = 'attribute-';
export const BUSINESS_ENTITIES_PREFIX = 'businessEntities-';

/**
 * Define an AI prompt that can be loaded from Transcend
 */
export class TranscendAiPrompt<
  TParams extends ObjByString,
  TOutputCodec extends t.Any,
> {
  /** Title of prompt */
  public title: string;

  /** Codec to validate output response */
  public codec: TOutputCodec;

  /** Handlebars compiler */
  public handlebars: typeof handlebars;

  /** Extract response from this tag */
  public extractFromTagRegex?: RegExp;

  /**
   * Constructor
   *
   * @param options - Options
   */
  constructor({
    title,
    codec,
    extractFromTag,
    handlebarsOptions,
  }: {
    /** Title of prompt in transcend */
    title: string;
    /** Codec to validate output shape of the prompt */
    codec: TOutputCodec;
    /** Options for configuring handlebars */
    handlebarsOptions?: HandlebarsInput;
    /** When provided, the response should be extracted from this tag name e.g. json */
    extractFromTag?: string;
  }) {
    this.title = title;
    this.codec = codec;
    this.handlebars = createHandlebarsWithHelpers(handlebarsOptions);
    this.extractFromTagRegex = extractFromTag
      ? new RegExp(`<${extractFromTag}>([\\s\\S]+?)<\\/${extractFromTag}>`)
      : undefined;
  }

  /**
   * Fetch prompt from Transcend
   *
   * @param options - Additional options
   * @returns A function that can be used to call the prompt
   */
  async fetchPromptFromTranscend({
    fillTemplateFromInventory = true,
    transcendUrl = DEFAULT_TRANSCEND_API,
    transcendApiKey,
    requireApproval,
  }: {
    /** The Transcend API key */
    transcendApiKey: string | Secret<string>;
    /** When true, template in any attribute definitions in the prompt */
    fillTemplateFromInventory?: boolean;
    /** API of Transcend to call */
    transcendUrl?: string;
    /** When true, throw an error if the prompt is not approved */
    requireApproval?: boolean;
  }): Promise<(params: TParams) => string> {
    // construct GraphQL client
    const client = buildTranscendGraphQLClient(
      transcendUrl,
      typeof transcendApiKey === 'string'
        ? transcendApiKey
        : transcendApiKey.release(),
    );

    // Fetch the assessments
    const assessments = await fetchAllAssessments(client, { text: this.title });

    // Ensure assessment exists with specified title
    const assessment = assessments.find((row) => row.title === this.title);
    if (!assessment) {
      throw new Error(`Failed to find assessment with title: "${this.title}"`);
    }

    // Ensure assessment is approved
    if (requireApproval && assessment.status !== AssessmentStatus.Approved) {
      throw new Error(
        `Assessment "${this.title}" cannot be used because its in status: "${assessment.status}"`,
      );
    }

    // If assessment is rejected, throw error
    if (assessment.status === AssessmentStatus.Rejected) {
      throw new Error(
        `Assessment "${this.title}" cannot be used because it's in status: "${assessment.status}"`,
      );
    }

    // Template attributes into the template string
    const extraParams: ObjByString = {};

    // Template in attributes
    if (fillTemplateFromInventory) {
      // pull out the variables from the handlebar string
      const schema = getVariablesFromHandlebarsTemplate(assessment.content);

      // pull out the attributes to fetch
      const attributeToFetch = Object.keys(schema).filter((key) =>
        key.startsWith(EXPECTED_ATTRIBUTE_PREFIX),
      );

      // Fetch attributes if there are template variables to fill
      if (attributeToFetch.length > 0) {
        // TODO: https://transcend.height.app/T-29886 - only fetch attributes needed
        const attributeKeys = await fetchAllAttributes(client);
        const attributeKeysAsCamel = attributeKeys.map((key) => ({
          ...key,
          camelName: camelCase(key.name),
        }));
        const lookupAttributeKey = keyBy(attributeKeysAsCamel, 'camelName');
        attributeToFetch.forEach((attributeNameWithPrefix) => {
          const attributeName = attributeNameWithPrefix.replace(
            EXPECTED_ATTRIBUTE_PREFIX,
            '',
          );
          const existingAttribute = lookupAttributeKey[attributeName];
          if (!existingAttribute) {
            throw new Error(
              `Failed to find attribute with name: "${attributeName}"`,
            );
          }
          extraParams[attributeNameWithPrefix] = existingAttribute;
        });
      }

      // pull out the attributes to fetch
      const businessEntitiesToFetch = Object.keys(schema).filter((key) =>
        key.startsWith(BUSINESS_ENTITIES_PREFIX),
      );

      // Fetch business entities if there are template variables to fill
      if (businessEntitiesToFetch.length > 0) {
        // TODO: https://transcend.height.app/T-29886 - only fetch business needed
        // and find a way to template when multiple entities
        const businessEntities = await fetchAllBusinessEntities(client);
        const businessEntity = businessEntities[0];
        if (businessEntity) {
          extraParams.dataProtectionOfficerName =
            businessEntity.dataProtectionOfficerName;
          extraParams.dataProtectionOfficerEmail =
            businessEntity.dataProtectionOfficerEmail;
        }
      }
    }

    // Return function that can compile template with attributes
    // and provided parameters
    return (params) =>
      this.handlebars.compile(assessment.content)({
        // template in currentDate by default
        currentDate: new Date().toISOString(),
        ...extraParams,
        ...params,
      });
  }

  /**
   * Validate the shape of the response from AI
   *
   * @param response - AI response as string
   * @returns Parsed content
   */
  parseAiResponse(response: string): t.TypeOf<TOutputCodec> {
    const extracted = this.extractFromTagRegex
      ? (this.extractFromTagRegex.exec(response) || [])[1] || response
      : response;
    return decodeCodec(this.codec, extracted);
  }
}
