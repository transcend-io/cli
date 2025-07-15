import type { LocalContext } from '../../../context';
import { markSilentPrivacyRequests } from '../../../lib/requests';
import type { RequestAction, RequestStatus } from '@transcend-io/privacy-types';

interface MarkSilentCommandFlags {
  auth: string;
  actions: RequestAction[];
  statuses?: RequestStatus[];
  requestIds?: string[];
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  transcendUrl: string;
  concurrency: number;
}

export async function markSilent(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    actions,
    statuses,
    requestIds,
    createdAtBefore,
    createdAtAfter,
    concurrency,
  }: MarkSilentCommandFlags,
): Promise<void> {
  await markSilentPrivacyRequests({
    transcendUrl,
    requestActions: actions,
    auth,
    requestIds,
    statuses,
    concurrency,
    createdAtBefore,
    createdAtAfter,
  });
}
