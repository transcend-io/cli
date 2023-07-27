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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: any[] = [];
      fs.createReadStream(dataFlowExportCsv)
        .pipe(csv())
        .on('data', (row) => {
          const dataFlow = row['Connections Made To'];
          const relevantLegalDecision = legalDecisions.get(dataFlow);
          if (relevantLegalDecision) {
            logger.info(
              `Found a legal decision for ${dataFlow}. Old status was ${row.Purpose}, new is ${relevantLegalDecision}`,
            );
          }

          records.push({
            ...row,
            Purpose: relevantLegalDecision ?? row.Purpose,
            /** If a legal decision was made, make the data flow live */
            Status: relevantLegalDecision !== undefined ? 'LIVE' : row.Status,
          });
        })
        .on('end', () => {
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
