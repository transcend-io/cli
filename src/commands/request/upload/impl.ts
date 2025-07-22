import type { LocalContext } from '../../../context';
import {
  splitCsvToList,
  uploadPrivacyRequestsFromCsv,
} from '../../../lib/requests';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface UploadCommandFlags {
  auth: string;
  file: string;
  transcendUrl: string;
  cacheFilepath: string;
  requestReceiptFolder: string;
  sombraAuth?: string;
  concurrency: number;
  attributes: string;
  isTest: boolean;
  isSilent: boolean;
  skipSendingReceipt: boolean;
  emailIsVerified: boolean;
  skipFilterStep: boolean;
  dryRun: boolean;
  debug: boolean;
  defaultPhoneCountryCode: string;
}

export async function upload(
  this: LocalContext,
  {
    auth,
    file,
    transcendUrl,
    cacheFilepath,
    requestReceiptFolder,
    sombraAuth,
    concurrency,
    attributes,
    isTest,
    isSilent,
    skipSendingReceipt,
    emailIsVerified,
    skipFilterStep,
    dryRun,
    debug,
    defaultPhoneCountryCode,
  }: UploadCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await uploadPrivacyRequestsFromCsv({
    cacheFilepath,
    requestReceiptFolder,
    file,
    auth,
    sombraAuth,
    concurrency,
    transcendUrl,
    defaultPhoneCountryCode,
    attributes: splitCsvToList(attributes),
    debug,
    skipFilterStep,
    isSilent,
    skipSendingReceipt,
    emailIsVerified,
    isTest,
    dryRun,
  });
}
