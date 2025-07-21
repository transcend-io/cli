import type { LocalContext } from '../../../../context';
import type { RequestAction } from '@transcend-io/privacy-types';
import { retryRequestDataSilos as retryRequestDataSilosHelper } from '../../../../lib/requests';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation';

export interface RetryRequestDataSilosCommandFlags {
  auth: string;
  dataSiloId: string;
  actions: RequestAction[];
  transcendUrl: string;
}

export async function retryRequestDataSilos(
  this: LocalContext,
  {
    auth,
    dataSiloId,
    actions,
    transcendUrl,
  }: RetryRequestDataSilosCommandFlags,
): Promise<void> {
  doneInputValidation();

  await retryRequestDataSilosHelper({
    requestActions: actions,
    transcendUrl,
    auth,
    dataSiloId,
  });
}
