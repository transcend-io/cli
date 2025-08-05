import { GraphQLClient } from 'graphql-request';
import { PROCESSING_ACTIVITIES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import type {
  ProcessingPurpose,
  DataCategoryType,
} from '@transcend-io/privacy-types';
import type { Region } from './formatRegions';

export interface ProcessingActivity {
  /** ID of processing activity */
  id: string;
  /** Title of processing activity */
  title: string;
  /** Description of processing activity */
  description: string;
  /** Security measure details */
  securityMeasureDetails?: string;
  /** Controllerships */
  controllerships: string[];
  /** Storage regions */
  storageRegions: Region[];
  /** Transfer regions */
  transferRegions: Region[];
  /** Retention type */
  retentionType: string;
  /** Retention period in days */
  retentionPeriod?: number;
  /** Data protection impact assessment link */
  dataProtectionImpactAssessmentLink?: string;
  /** Data protection impact assessment status */
  dataProtectionImpactAssessmentStatus: string;
  /** Attribute values */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key */
    attributeKey: {
      /** Name of attribute key */
      name: string;
    };
  }[];
  /** Data silos */
  dataSilos: {
    /** Data silo title */
    title: string;
  }[];
  /** Data subjects */
  dataSubjects: {
    /** Data subject type */
    type: string;
  }[];
  /** Teams */
  teams: {
    /** Team name */
    name: string;
  }[];
  /** Owners */
  owners: {
    /** Owner email */
    email: string;
  }[];
  /** Processing purpose sub categories */
  processingPurposeSubCategories: {
    /** Processing purpose sub category name */
    name: string;
    /** Processing purpose */
    purpose: ProcessingPurpose;
  }[];
  /** Data sub categories */
  dataSubCategories: {
    /** Data sub category name */
    name: string;
    /** Data category */
    category: DataCategoryType;
  }[];
  /** SaaS categories */
  saaSCategories: {
    /** Title */
    title: string;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all processingActivities in the organization
 *
 * @param client - GraphQL client
 * @returns All processingActivities in the organization
 */
export async function fetchAllProcessingActivities(
  client: GraphQLClient,
): Promise<ProcessingActivity[]> {
  const processingActivities: ProcessingActivity[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      processingActivities: { nodes },
    } = await makeGraphQLRequest<{
      /** Processing activities */
      processingActivities: {
        /** List */
        nodes: ProcessingActivity[];
      };
    }>(client, PROCESSING_ACTIVITIES, {
      first: PAGE_SIZE,
      offset,
    });
    processingActivities.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return processingActivities.sort((a, b) => a.title.localeCompare(b.title));
}
