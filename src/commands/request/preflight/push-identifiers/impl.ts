import type { LocalContext } from '../../../../context';
import { pushManualEnrichmentIdentifiersFromCsv } from '../../../../lib/manual-enrichment';

export interface PushIdentifiersCommandFlags {
  auth: string;
  enricherId: string;
  sombraAuth?: string;
  transcendUrl: string;
  file: string;
  markSilent: boolean;
  concurrency: number;
}

export async function pushIdentifiers(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    file,
    enricherId,
    concurrency,
    markSilent,
    sombraAuth,
  }: PushIdentifiersCommandFlags,
): Promise<void> {
  await pushManualEnrichmentIdentifiersFromCsv({
    file,
    transcendUrl,
    enricherId,
    concurrency,
    markSilent,
    auth,
    sombraAuth,
  });
}
