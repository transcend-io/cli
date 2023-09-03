import { TemplateInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { TEMPLATES, CREATE_TEMPLATE } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Template {
  /** ID of Template */
  id: string;
  /** Title of Template */
  title: string;
  /** Template subject (e.g. email subject) */
  subject: {
    /** Default message for template subject */
    defaultMessage: string;
  };
  /** Template body - rich text HTML */
  template: {
    /** Default message for template body */
    defaultMessage: string;
  };
}

const PAGE_SIZE = 20;

/**
 * Fetch all Templates in the organization
 *
 * @param client - GraphQL client
 * @param title - Filter by title
 * @returns All Templates in the organization
 */
export async function fetchAllTemplates(
  client: GraphQLClient,
  title?: string,
): Promise<Template[]> {
  const templates: Template[] = [];
  let offset = 0;

  // Try to fetch an Template with the same title
  let shouldContinue = false;
  do {
    const {
      templates: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Query response */
      templates: {
        /** List of matches */
        nodes: Template[];
      };
    }>(client, TEMPLATES, {
      first: PAGE_SIZE,
      offset,
      title,
    });
    templates.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return templates.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Sync an email template configuration
 *
 * @param template - The email template input
 * @param client - GraphQL client
 */
export async function syncTemplate(
  template: TemplateInput,
  client: GraphQLClient,
): Promise<void> {
  // Try to fetch an Template with the same title
  const matches = await fetchAllTemplates(client, template.title);
  const existingTemplate = matches.find(
    ({ title }) => title === template.title,
  );

  // If Template exists, update it
  if (!existingTemplate) {
    await makeGraphQLRequest(client, CREATE_TEMPLATE, {
      title: template.title,
    });
  }
}
