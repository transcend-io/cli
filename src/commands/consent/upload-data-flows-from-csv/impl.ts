import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import type { LocalContext } from '../../../context';
import { uploadDataFlowsFromCsv as uploadDataFlowsFromCsvHelper } from '../../../lib/consent-manager';

interface UploadDataFlowsFromCsvCommandFlags {
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
