import type { LocalContext } from '@/context';
import { skipPreflightJobs as skipPreflightJobsHelper } from '@/lib/requests';

interface SkipPreflightJobsCommandFlags {
  auth: string;
  enricherIds: string[];
  transcendUrl: string;
}

export async function skipPreflightJobs(
  this: LocalContext,
  { auth, transcendUrl, enricherIds }: SkipPreflightJobsCommandFlags,
): Promise<void> {
  await skipPreflightJobsHelper({
    transcendUrl,
    auth,
    enricherIds,
  });
}
