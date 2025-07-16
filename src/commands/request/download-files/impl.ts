import type { LocalContext } from '../../../context';
import { downloadPrivacyRequestFiles } from '../../../lib/requests';
import { RequestStatus } from '@transcend-io/privacy-types';

interface DownloadFilesCommandFlags {
  auth: string;
  sombraAuth?: string;
  concurrency: number;
  requestIds?: string[];
  statuses?: RequestStatus[];
  folderPath: string;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
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
    approveAfterDownload,
  }: DownloadFilesCommandFlags,
): Promise<void> {
  await downloadPrivacyRequestFiles({
    transcendUrl,
    auth,
    folderPath,
    requestIds,
    statuses,
    concurrency,
    createdAtBefore,
    createdAtAfter,
    approveAfterDownload,
  });
}
