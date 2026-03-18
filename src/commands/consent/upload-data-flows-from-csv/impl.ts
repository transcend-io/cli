import type { LocalContext } from '../../../context';
import { uploadDataFlowsFromCsv as uploadDataFlowsFromCsvHelper } from '../../../lib/consent-manager';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

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
  doneInputValidation(this.process.exit);

  await uploadDataFlowsFromCsvHelper({
    auth,
    trackerStatus,
    file,
    classifyService,
    transcendUrl,
  });
}
