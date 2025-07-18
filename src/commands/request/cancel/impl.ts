import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import type { LocalContext } from '../../../context';
import { cancelPrivacyRequests } from '../../../lib/requests';

interface CancelCommandFlags {
  auth: string;
  actions: RequestAction[];
  statuses?: RequestStatus[];
  requestIds?: string[];
  silentModeBefore?: Date;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  cancellationTitle: string;
  transcendUrl: string;
  concurrency: number;
}

export async function cancel(
  this: LocalContext,
  {
    auth,
    actions,
    statuses = [],
    requestIds,
    silentModeBefore,
    createdAtBefore,
    createdAtAfter,
    cancellationTitle,
    transcendUrl,
    concurrency,
  }: CancelCommandFlags,
): Promise<void> {
  await cancelPrivacyRequests({
    transcendUrl,
    requestActions: actions,
    auth,
    cancellationTitle,
    requestIds,
    statuses,
    concurrency,
    silentModeBefore: silentModeBefore ? new Date(silentModeBefore) : undefined,
    createdAtBefore: createdAtBefore ? new Date(createdAtBefore) : undefined,
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
  });
}
