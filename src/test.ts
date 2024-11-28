import { readCsv } from './requests';
import * as t from 'io-ts';
import { uniqBy } from 'lodash';
import { writeCsv } from './cron';

/**
 *
 */
async function runtest() {
  const data = readCsv(
    '/Users/michaelfarrell/Desktop/deputy/salesforce_contacts.csv',
    t.record(t.string, t.string),
  );
  const uniqueData = uniqBy(data, 'Email');
  writeCsv(
    '/Users/michaelfarrell/Desktop/deputy/salesforce_contacts_uniq.csv',
    uniqueData,
  );
}

runtest();
