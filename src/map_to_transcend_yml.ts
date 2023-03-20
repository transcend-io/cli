import fs from 'fs';
import * as t from 'io-ts';
import { readCsv, TranscendInput } from './index';
import uniqBy from 'lodash/uniqBy';
import yaml from 'js-yaml';
import {
  DataFlowScope,
  ConsentTrackerStatus,
} from '@transcend-io/privacy-types';

const AUTHORITATIVE =
  '/Users/michaelfarrell/transcend/main/backend-services/service-classifier/resources/authoritative.yaml';
const IN_FILE = '/Users/michaelfarrell/Desktop/vz-data-flows.csv';
const OUT_FILE = './transcend.yml';
const authority = yaml.load(fs.readFileSync(AUTHORITATIVE, 'utf-8'));

const Codec = t.type({
  'Vendor Name': t.string,
  'Vendor Parent': t.string,
  'Tracker Domain': t.string,
  Designation: t.string,
  'Contract Description from Kathy': t.string,
  Comments: t.string,
  About: t.string,
  'Current Name': t.string,
  'Current Parent': t.string,
  Site: t.string,
  Location: t.string,
});

/**
 * Type override
 */
type Codec = t.TypeOf<typeof Codec>;

// Read in contents
const fileContents = readCsv(IN_FILE, Codec);

const entries = fileContents.map((content) => ({
  value: content['Tracker Domain'],
  type: DataFlowScope.Host,
  description: content.Comments || undefined,
  trackingPurposes:
    content.Designation === 'Ad Tech'
      ? ['SaleOfInfo']
      : content.Designation === 'First Party' ||
        content.Designation === 'Site Tech'
      ? ['Essential']
      : [],
  service:
    content.Designation === 'First Party'
      ? 'internalService'
      : authority[content['Tracker Domain']]?.[0]?.integrationName,
  status: ConsentTrackerStatus.Live,
  attributes: [
    {
      key: 'Vendor Name',
      values: [content['Vendor Name']],
    },
    {
      key: 'Vendor Parent',
      values: [content['Vendor Parent']],
    },
    {
      key: 'Contract Description from Kathy',
      values: [content['Contract Description from Kathy']],
    },
    {
      key: 'About',
      values: [content.About],
    },
    {
      key: 'Current Name',
      values: [content['Current Name']],
    },
    // FIXME
    // {
    //   key: 'Site',
    //   values: [content.Site],
    // },
    {
      key: 'Location',
      values: [content.Location],
    },
    {
      key: 'Current Parent',
      values: [content['Current Parent']],
    },
    {
      key: 'Tech Type',
      values: [content.Designation],
    },
  ].filter(({ values }) => values[0] && values[0].length > 0),
}));

// Construct transcend.yml
const outYaml: TranscendInput = {
  'data-flows': uniqBy(entries, (entry) => `${entry.value}:${entry.type}`),
};

// write to disk
fs.writeFileSync(OUT_FILE, yaml.dump(outYaml));
