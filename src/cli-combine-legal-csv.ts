#!/usr/bin/env/node

import fs from 'fs';
import csv from 'csv-parser';
import yargs from 'yargs-parser';
import { createObjectCsvWriter } from 'csv-writer';

import { logger } from './logger';

/**
 * Combines information in a CSV from a legal team into a CSV of data flow data
 *
 * yarn ts-node ./src/cli-combine-legal-csv.ts \
 *   --legalCsv=/Users/michaelfarrell/Desktop/legal.csv \
 *   --dataFlowExportCsv=/Users/michaelfarrell/Desktop/data-flows.csv
 *   --output=/Users/michaelfarrell/Desktop/output.csv
 *
 * Standard usage:
 * yarn tr-combine-legal-csv \
 *   --legalCsv=/Users/michaelfarrell/Desktop/legal.csv \
 *   --dataFlowExportCsv=/Users/michaelfarrell/Desktop/data-flows.csv
 *   --output=/Users/michaelfarrell/Desktop/output.csv
 *
 * @deprecated - This function should not be merged, it is useful for a single customer
 */
function main(): void {
  // Parse command line arguments
  const {
    legalCsv = './legalMaster.csv',
    dataFlowExportCsv = './triage-data-flows.csv',
    output = './combined.csv',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  /**
   * NOTES: This first part here is reading in the legal CSV file and extracting
   * information from each row on a domain and a CPRA Language field, which is where they
   * are putting SaleOfInfo or something like it. Stores into the map `legalDecisions`
   */
  logger.info(`Reading in legal decisions from ${legalCsv}`);
  const legalDecisions = new Map<string, string>();
  fs.createReadStream(legalCsv)
    .pipe(csv())
    .on('data', (row) => {
      const domain = row['Tracker Domain'];
      const decision = row['CPRA Language'];
      legalDecisions.set(domain, decision);
    })
    .on('end', () => {
      logger.info(
        `Reading file located at ${dataFlowExportCsv} and updating with info from the legal team decisions`,
      );

      /**
       * NOTES: This deeply nested, hacky blob of code reads through the dataFlowExportCsv file, which
       * is expected to be in the format that tr-upload-data-flows-from-csv expects, which is also the format
       * that is exported from the Admin Dashboard. We look at each row and try to determine if we should override
       * the `Status` column if the legal sheet gave an authoritative answer on either the domain, or any parent
       * domain of the domain in that row, which is a feature explicitly requested.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: any[] = [];
      fs.createReadStream(dataFlowExportCsv)
        .pipe(csv())
        .on('data', (row) => {
          const dataFlow = row['Connections Made To'];
          const dataFlowParts = dataFlow.split('.');
          for (let i = dataFlowParts.length; i > 1; i -= 1) {
            const domainPart = dataFlowParts.slice(-i).join('.');
            const relevantLegalDecision = legalDecisions.get(domainPart);
            if (relevantLegalDecision) {
              logger.info(
                // eslint-disable-next-line max-len
                `Found a legal decision for ${dataFlow} under ${domainPart}. Old status was ${row.Purpose}, new is ${relevantLegalDecision}`,
              );
              records.push({
                ...row,
                Purpose: relevantLegalDecision ?? row.Purpose,
                /** If a legal decision was made, make the data flow live */
                Status:
                  relevantLegalDecision !== undefined ? 'LIVE' : row.Status,
              });
              return;
            }
          }
        })
        .on('end', () => {
          /**
           * NOTES: At the end, writes out a new CSV file with the changes
           */
          const csvWriter = createObjectCsvWriter({
            path: output,
            header: Object.keys(records[0] ?? {}).map((header) => ({
              id: header,
              title: header,
            })),
          });

          csvWriter
            .writeRecords(records)
            .then(() =>
              logger.info(
                `Finished writing combined output with ${records.length} rows`,
              ),
            );
        });
    });
}

main();
