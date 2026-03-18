import type { LocalContext } from '../../../context';
import { uploadCookiesFromCsv as uploadCookiesFromCsvHelper } from '../../../lib/consent-manager';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface UploadCookiesFromCsvCommandFlags {
  auth: string;
  trackerStatus: ConsentTrackerStatus;
  file: string;
  transcendUrl: string;
}

export async function uploadCookiesFromCsv(
  this: LocalContext,
  { auth, trackerStatus, file, transcendUrl }: UploadCookiesFromCsvCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // Upload cookies
  await uploadCookiesFromCsvHelper({
    auth,
    trackerStatus,
    file,
    transcendUrl,
  });
}
