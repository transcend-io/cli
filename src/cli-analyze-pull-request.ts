#!/usr/bin/env node
import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { DEFAULT_TRANSCEND_API } from './constants';
import { fetchAllAssessmentTemplates } from './graphql/fetchAssessmentTemplates';
import { buildTranscendGraphQLClient } from './graphql';
import { inquirerAutoComplete } from './helpers/inquirer';
import { fetchAllAssessments } from './graphql/fetchAssessments';

/**
 * Analyze a pull request to see if it requires a privacy assessment
 *
 * Requires scopes:
 * - View Assessments
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-analyze-pull-request.ts --auth=$TRANSCEND_API_KEY \
 *   --template="Product Manager JSON AI Prompt Template
 *   --title="Determine Product Line"
 *
 * Standard usage:
 * yarn tr-analyze-pull-request --auth=$TRANSCEND_API_KEY  \
 *   --template="[AI Prompt] Detect Privacy Impact Assessment"
 *   --title="Determine Product Line"
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** Transcend Backend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** The name of the assessment template to use */
    template = '',
    /** The title of the new template */
    title = '',
    /** Base branch to compare to */
    // baseBranch = '',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Create client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Validate title, if not provided prompt user
  let templateTitle = title;
  if (!templateTitle) {
    const assessments = await fetchAllAssessments(client);
    const selectedTemplate = await inquirerAutoComplete({
      message: 'Select assessment to use for code analysis',
      values: assessments.map(({ title }) => title),
    });
    templateTitle = selectedTemplate;
  }

  // Validate template
  const assessmentTemplates = await fetchAllAssessmentTemplates(client);
  const validTitles = assessmentTemplates.map(({ title }) => title);

  // If provided, ensure valid
  if (template && !validTitles.includes(template)) {
    throw new Error(
      `Invalid template "${template}", expected one of: ${validTitles.join(
        ', ',
      )}`,
    );
  }

  // Prompt user if not provided
  let selectedTemplate = template;
  if (!selectedTemplate) {
    selectedTemplate = await inquirerAutoComplete({
      message: 'Select assessment template',
      values: validTitles,
    });
  }

  // Get the assessment template
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const assessmentTemplate = assessmentTemplates.find(
    (template) => template.title === selectedTemplate,
  )!;

  logger.info(
    colors.magenta(
      `\n\n~~~~Formatting template~~~~~\n\n${assessmentTemplate.content}`,
    ),
  );
}

main();
