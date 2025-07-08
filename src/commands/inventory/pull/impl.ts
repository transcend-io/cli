import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import type { LocalContext } from '../../../context';
import { TranscendPullResource } from '../../../enums';
import {
  DEFAULT_CONSENT_TRACKER_STATUSES,
  DEFAULT_TRANSCEND_PULL_RESOURCES,
} from './command';

interface PullCommandFlags {
  auth: string;
  resources?: TranscendPullResource[];
  file: string;
  transcendUrl: string;
  dataSiloIds?: string[];
  integrationNames?: string[];
  trackerStatuses?: ConsentTrackerStatus[];
  pageSize: number;
  skipDatapoints: boolean;
  skipSubDatapoints: boolean;
  includeGuessedCategories: boolean;
  debug: boolean;
}

export function pull(
  this: LocalContext,
  {
    auth,
    resources = DEFAULT_TRANSCEND_PULL_RESOURCES,
    file,
    transcendUrl,
    dataSiloIds,
    integrationNames,
    trackerStatuses = DEFAULT_CONSENT_TRACKER_STATUSES,
    pageSize,
    skipDatapoints,
    skipSubDatapoints,
    includeGuessedCategories,
    debug,
  }: PullCommandFlags,
): void {
  console.log('Pull command started...');
  console.log('Flags:', {
    auth,
    resources,
    file,
    transcendUrl,
    dataSiloIds,
    integrationNames,
    trackerStatuses,
    pageSize,
    skipDatapoints,
    skipSubDatapoints,
    includeGuessedCategories,
    debug,
  });

  throw new Error('Not implemented');
}
