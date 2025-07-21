import type { LocalContext } from '../../../../context';
import { pushCronIdentifiersFromCsv } from '../../../../lib/cron';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation';

export interface MarkIdentifiersCompletedCommandFlags {
  file: string;
  transcendUrl: string;
  auth: string;
  sombraAuth?: string;
  dataSiloId: string;
}

export async function markIdentifiersCompleted(
  this: LocalContext,
  {
    file,
    transcendUrl,
    auth,
    sombraAuth,
    dataSiloId,
  }: MarkIdentifiersCompletedCommandFlags,
): Promise<void> {
  doneInputValidation();

  await pushCronIdentifiersFromCsv({
    file,
    transcendUrl,
    auth,
    sombraAuth,
    dataSiloId,
  });
}
