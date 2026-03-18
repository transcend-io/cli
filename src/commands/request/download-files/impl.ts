import type { LocalContext } from '../../../context';
import { downloadPrivacyRequestFiles } from '../../../lib/requests';
import { RequestStatus } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface DownloadFilesCommandFlags {
  auth: string;
  sombraAuth?: string;
  concurrency: number;
  requestIds?: string[];
  statuses?: RequestStatus[];
  folderPath: string;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  updatedAtBefore?: Date;
  updatedAtAfter?: Date;
  approveAfterDownload: boolean;
  transcendUrl: string;
}

export async function downloadFiles(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    folderPath,
    requestIds,
    statuses = [RequestStatus.Approving, RequestStatus.Downloadable],
    concurrency,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    approveAfterDownload,
  }: DownloadFilesCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await downloadPrivacyRequestFiles({
    transcendUrl,
    auth,
    folderPath,
    requestIds,
    statuses,
    concurrency,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    approveAfterDownload,
  });
}
