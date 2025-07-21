import type { LocalContext } from '../../../context';

import { RequestAction, RequestOrigin } from '@transcend-io/privacy-types';
import { approvePrivacyRequests } from '../../../lib/requests';

export interface ApproveCommandFlags {
  auth: string;
  actions: RequestAction[];
  origins?: RequestOrigin[];
  silentModeBefore?: Date;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  transcendUrl: string;
  concurrency: number;
}

export async function approve(
  this: LocalContext,
  {
    auth,
    actions,
    origins,
    silentModeBefore,
    createdAtBefore,
    createdAtAfter,
    transcendUrl,
    concurrency,
  }: ApproveCommandFlags,
): Promise<void> {
  await approvePrivacyRequests({
    transcendUrl,
    requestActions: actions,
    auth,
    requestOrigins: origins,
    concurrency,
    silentModeBefore,
    createdAtBefore,
    createdAtAfter,
  });
}
