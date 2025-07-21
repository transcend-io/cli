import type { LocalContext } from '../../../context';
import { skipPreflightJobs as skipPreflightJobsHelper } from '../../../lib/requests';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface SkipPreflightJobsCommandFlags {
  auth: string;
  enricherIds: string[];
  transcendUrl: string;
}

export async function skipPreflightJobs(
  this: LocalContext,
  { auth, transcendUrl, enricherIds }: SkipPreflightJobsCommandFlags,
): Promise<void> {
  doneInputValidation();

  await skipPreflightJobsHelper({
    transcendUrl,
    auth,
    enricherIds,
  });
}
