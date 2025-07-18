import { RequestAction, RequestOrigin } from '@transcend-io/privacy-types';
import type { LocalContext } from '../../../context';
import { approvePrivacyRequests } from '../../../lib/requests';

interface ApproveCommandFlags {
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
