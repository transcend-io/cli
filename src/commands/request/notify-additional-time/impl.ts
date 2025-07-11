import type { LocalContext } from '@/context';
import { notifyPrivacyRequestsAdditionalTime } from '@/lib/requests';
import type { RequestAction } from '@transcend-io/privacy-types';

interface NotifyAdditionalTimeCommandFlags {
  auth: string;
  createdAtBefore: Date;
  createdAtAfter?: Date;
  actions?: RequestAction[];
  daysLeft: number;
  days: number;
  requestIds?: string[];
  emailTemplate: string;
  transcendUrl: string;
  concurrency: number;
}

export async function notifyAdditionalTime(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    createdAtBefore,
    createdAtAfter,
    actions,
    daysLeft,
    days,
    requestIds,
    emailTemplate,
    concurrency,
  }: NotifyAdditionalTimeCommandFlags,
): Promise<void> {
  await notifyPrivacyRequestsAdditionalTime({
    transcendUrl,
    requestActions: actions,
    auth,
    emailTemplate,
    days,
    daysLeft,
    requestIds,
    concurrency,
    createdAtBefore,
    createdAtAfter,
  });
}
