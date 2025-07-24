import type { LocalContext } from '../../../context';
import { markSilentPrivacyRequests } from '../../../lib/requests';
import type { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface MarkSilentCommandFlags {
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
  doneInputValidation(this.process.exit);

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
