import type { LocalContext } from '../../../context';

import { fetchConsentPreferences } from '../../../lib/consent-manager';
import { writeCsv } from '../../../lib/cron';
import { createSombraGotInstance } from '../../../lib/graphql';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface PullConsentPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  file: string;
  transcendUrl: string;
  timestampBefore?: Date;
  timestampAfter?: Date;
  identifiers?: string[];
  concurrency: number;
}

export async function pullConsentPreferences(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    file,
    transcendUrl,
    timestampBefore,
    timestampAfter,
    identifiers = [],
    concurrency,
  }: PullConsentPreferencesCommandFlags,
): Promise<void> {
  doneInputValidation();

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Fetch preferences
  const preferences = await fetchConsentPreferences(sombra, {
    partition,
    filterBy: {
      ...(timestampBefore
        ? { timestampBefore: timestampBefore.toISOString() }
        : {}),
      ...(timestampAfter
        ? { timestampAfter: timestampAfter.toISOString() }
        : {}),
      ...(identifiers.length > 0 ? { identifiers } : {}),
    },
    limit: concurrency,
  });

  // Write to disk
  writeCsv(
    file,
    preferences.map((pref) => ({
      ...pref,
      purposes: JSON.stringify(pref.purposes),
      ...pref.purposes,
    })),
  );
}
