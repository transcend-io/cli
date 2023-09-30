#!/usr/bin/env node
import handlebars from 'handlebars';
import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { DEFAULT_TRANSCEND_API } from './constants';
import { fetchAllAssessmentTemplates } from './graphql/fetchAssessmentTemplates';
import { buildTranscendGraphQLClient } from './graphql';
import { getVariablesFromHandlebarsTemplate } from './helpers/getVariablesFromHandlebarsTemplate';
import { mapSeries } from 'bluebird';
import {
  inquirerAutoComplete,
  inquirerConfirmBoolean,
  inquirerConfirmText,
} from './helpers/inquirer';
import { parseVariablesFromString } from './helpers/parseVariablesFromString';
import { createAssessment, updateAssessment } from './graphql/syncAssessments';

/**
 * Create a new assessment from an assessment template
 *
 * Requires scopes:
 * - Manage Assessments
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-create-assessment.ts --auth=$TRANSCEND_API_KEY \
 *   --template="Product Manager JSON AI Prompt Template
 *   --title="Determine Product Line"
 *
 * Standard usage:
 * yarn tr-create-assessment --auth=$TRANSCEND_API_KEY  \
 *   --template="Product Manager JSON AI Prompt Template
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
    /** Other variables to template */
    variables = '',
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

  // Validate title, if not provided prompt user
  let templateTitle = title;
  if (!templateTitle) {
    templateTitle = await inquirerConfirmText({
      message: 'What should be the title of the new template?',
    });
  }

  // Validate template
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
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

  // Parse out the variables
  const vars = parseVariablesFromString(variables);

  // Pull the variables out of the template
  const schema = getVariablesFromHandlebarsTemplate(assessmentTemplate.content);
  const results: { [k in string]: unknown } = {};
  await mapSeries(Object.entries(schema), async ([variable, type]) => {
    // Format from cli option
    if (vars[variable]) {
      logger.info(
        colors.white(
          `[${variable}] Using cli provided variable for "${variable}": ${vars[variable]}`,
        ),
      );
      results[variable] =
        type && typeof type === 'object'
          ? JSON.parse(vars[variable])
          : vars[variable];
      return;
    }

    // Handle Arrays
    if (Array.isArray(type)) {
      const [first] = type;
      const result: { [k in string]: string }[] = [];
      /* eslint-disable no-await-in-loop */
      while (
        await inquirerConfirmBoolean({
          message: `[${variable}[${result.length}]] Add new entry?`,
        })
      ) {
        const datum: { [k in string]: string } = {};
        await mapSeries(Object.keys(first), async (k) => {
          const data = await inquirerConfirmText({
            message: `[${variable}[${result.length}].${k}]:`,
          });
          datum[k] = data;
        });
        result.push(datum);
      }
      /* eslint-enable no-await-in-loop */

      if (result.length > 0) {
        results[variable] = result;
      }
      return;
    }

    // Handle object
    if (type && typeof type === 'object') {
      const shouldRun = await inquirerConfirmBoolean({
        message: `[${variable}] Define object?[y/n]`,
      });
      if (shouldRun) {
        const datum: { [k in string]: string } = {};
        await mapSeries(Object.keys(type), async (k) => {
          const data = await inquirerConfirmText({
            message: `[${variable}.${k}]:`,
          });
          datum[k] = data;
        });
        results[variable] = datum;
      }
      return;
    }

    // Prompt user
    const result = await inquirerConfirmText({
      message: `[${variable}] Fill variable. Type "n" to skip`,
    });
    if (result !== 'n') {
      results[variable] = result;
    }
  });

  // Create new assessment
  const content = handlebars
    .compile(assessmentTemplate.content)(results)
    // remove empty lines
    .split('\n')
    .filter((x) => x.trim().length > 0)
    .join('\n');

  // Create the assessment
  const assessmentId = await createAssessment(client, {
    title: templateTitle,
    assessmentTemplateId: assessmentTemplate.id,
  });
  await updateAssessment(client, {
    id: assessmentId,
    content,
  });
  logger.info(
    colors.green(
      `View assessment at https://app.transcend.io/assessments/view/${assessmentId}`,
    ),
  );
}

main();
