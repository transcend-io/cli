import type { LocalContext } from '../../../context';
import { uploadDataFlowsFromCsv as uploadDataFlowsFromCsvHelper } from '../../../lib/consent-manager';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';

export interface UploadDataFlowsFromCsvCommandFlags {
  auth: string;
  trackerStatus: ConsentTrackerStatus;
  file: string;
  classifyService: boolean;
  transcendUrl: string;
}

export async function uploadDataFlowsFromCsv(
  this: LocalContext,
  {
    auth,
    trackerStatus,
    file,
    classifyService,
    transcendUrl,
  }: UploadDataFlowsFromCsvCommandFlags,
): Promise<void> {
  await uploadDataFlowsFromCsvHelper({
    auth,
    trackerStatus,
    file,
    classifyService,
    transcendUrl,
  });
}
