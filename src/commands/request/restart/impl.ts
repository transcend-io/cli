import type { LocalContext } from '../../../context';
import { bulkRestartRequests } from '../../../lib/requests';
import type { RequestAction, RequestStatus } from '@transcend-io/privacy-types';

export interface RestartCommandFlags {
  auth: string;
  actions: RequestAction[];
  statuses: RequestStatus[];
  transcendUrl: string;
  requestReceiptFolder: string;
  sombraAuth?: string;
  concurrency: number;
  requestIds?: string[];
  emailIsVerified: boolean;
  createdAt?: Date;
  silentModeBefore?: Date;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  sendEmailReceipt: boolean;
  copyIdentifiers: boolean;
  skipWaitingPeriod: boolean;
}

export async function restart(
  this: LocalContext,
  {
    auth,
    requestReceiptFolder,
    sombraAuth,
    actions,
    statuses,
    requestIds,
    createdAt,
    emailIsVerified,
    silentModeBefore,
    sendEmailReceipt,
    copyIdentifiers,
    skipWaitingPeriod,
    createdAtBefore,
    createdAtAfter,
    concurrency,
    transcendUrl,
  }: RestartCommandFlags,
): Promise<void> {
  await bulkRestartRequests({
    requestReceiptFolder,
    auth,
    sombraAuth,
    requestActions: actions,
    requestStatuses: statuses,
    requestIds,
    createdAt,
    emailIsVerified,
    silentModeBefore,
    sendEmailReceipt,
    copyIdentifiers,
    skipWaitingPeriod,
    createdAtBefore,
    createdAtAfter,
    concurrency,
    transcendUrl,
  });
}
