import type { LocalContext } from '../../../../context';
import type { RequestStatus } from '@transcend-io/privacy-types';
import { skipRequestDataSilos as skipRequestDataSilosHelper } from '../../../../lib/requests';

export interface SkipRequestDataSilosCommandFlags {
  auth: string;
  dataSiloId: string;
  transcendUrl: string;
  statuses: RequestStatus[];
  status: 'SKIPPED' | 'RESOLVED';
}

export async function skipRequestDataSilos(
  this: LocalContext,
  {
    auth,
    dataSiloId,
    status,
    statuses,
    transcendUrl,
  }: SkipRequestDataSilosCommandFlags,
): Promise<void> {
  await skipRequestDataSilosHelper({
    transcendUrl,
    auth,
    status,
    dataSiloId,
    requestStatuses: statuses,
  });
}
