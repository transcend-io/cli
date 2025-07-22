import type { LocalContext } from '../../../../context';
import type {
  RequestDataSiloStatus,
  RequestStatus,
} from '@transcend-io/privacy-types';
import { skipRequestDataSilos as skipRequestDataSilosHelper } from '../../../../lib/requests';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation';

export interface SkipRequestDataSilosCommandFlags {
  auth: string;
  dataSiloId: string;
  transcendUrl: string;
  statuses: RequestStatus[];
  status:
    | (typeof RequestDataSiloStatus)['Skipped']
    | (typeof RequestDataSiloStatus)['Resolved'];
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
  doneInputValidation(this.process.exit);

  await skipRequestDataSilosHelper({
    transcendUrl,
    auth,
    status,
    dataSiloId,
    requestStatuses: statuses,
  });
}
