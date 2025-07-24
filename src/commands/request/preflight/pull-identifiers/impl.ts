import type { LocalContext } from '../../../../context';
import { pullManualEnrichmentIdentifiersToCsv } from '../../../../lib/manual-enrichment';
import type { RequestAction } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation';

export interface PullIdentifiersCommandFlags {
  auth: string;
  sombraAuth?: string;
  transcendUrl: string;
  file: string;
  actions?: RequestAction[];
  concurrency: number;
}

export async function pullIdentifiers(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    file,
    concurrency,
    actions,
    sombraAuth,
  }: PullIdentifiersCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await pullManualEnrichmentIdentifiersToCsv({
    file,
    transcendUrl,
    concurrency,
    requestActions: actions,
    auth,
    sombraAuth,
  });
}
