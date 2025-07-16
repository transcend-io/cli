import type { LocalContext } from '../../../context';
import { bulkRetryEnrichers } from '../../../lib/requests';
import type {
  RequestAction,
  RequestEnricherStatus,
} from '@transcend-io/privacy-types';

interface EnricherRestartCommandFlags {
  auth: string;
  enricherId: string;
  actions?: RequestAction[];
  requestEnricherStatuses?: RequestEnricherStatus[];
  transcendUrl: string;
  concurrency: number;
  requestIds?: string[];
  createdAtBefore?: Date;
  createdAtAfter?: Date;
}

export async function enricherRestart(
  this: LocalContext,
  {
    auth,
    enricherId,
    actions,
    requestEnricherStatuses,
    requestIds,
    createdAtBefore,
    createdAtAfter,
    concurrency,
    transcendUrl,
  }: EnricherRestartCommandFlags,
): Promise<void> {
  await bulkRetryEnrichers({
    auth,
    enricherId,
    requestActions: actions,
    requestEnricherStatuses,
    requestIds,
    createdAtBefore: createdAtBefore ? new Date(createdAtBefore) : undefined,
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
    concurrency,
    transcendUrl,
  });
}
