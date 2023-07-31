#!/usr/bin/env/node

import fs from 'fs';
import csv from 'csv-parser';
import yaml from 'js-yaml';
import yargs from 'yargs-parser';

import { logger } from './logger';
import { CookieInput } from './codecs';

/**
 * Converts a CSV file of cookie updates into a yaml
 * file that can be uploaded via tr-push.
 *
 * yarn ts-node ./src/cli-cookie-csv-to-yml.ts \
 *   --file=/Users/michaelfarrell/Desktop/input.csv \
 *   --output=/Users/michaelfarrell/Desktop/output.yml
 *
 * Standard usage:
 * yarn tr-cookie-csv-to-yml \
    --input=/Users/michaelfarrell/Desktop/input.csv \
    --output=/Users/michaelfarrell/Desktop/output.yml
 *
 * @deprecated - This function is a hold until we have a tr-upload-cookies-from-csv
 */
function main(): void {
  // Parse command line arguments
  const { input = './cookies.csv', output = './cookies.yml' } = yargs(
    process.argv.slice(2),
  ) as { [k in string]: string };

  // Define an array to hold the converted data
  const cookies: CookieInput[] = [];

  // Read the CSV file
  logger.info(`Reading file located at ${input}. Writing out to ${output}`);
  fs.createReadStream(input)
    .pipe(csv())
    .on('data', (row) => {
      // Map the CSV data to the desired YAML structure
      const yamlEntry = {
        name: row.Name,
        isRegex: row['Is Regex?'].toLowerCase() === 'true',
        description: row['Service Description'],
        trackingPurposes: row.Purpose ? row.Purpose.split(',') : [],
        status: row.Status,
        service: row.Service,
        owners: row.Owners ? row.Owners.split(',') : [],
        teams: row.Teams ? row.Teams.split(',') : [],
      };

      cookies.push(yamlEntry);
    })
    .on('end', () => {
      const yamlString = yaml.dump({ cookies });
      fs.writeFileSync(output, yamlString);
    });
}

main();
