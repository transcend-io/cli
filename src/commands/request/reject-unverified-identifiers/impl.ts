import type { LocalContext } from '../../../context';
import { removeUnverifiedRequestIdentifiers } from '../../../lib/requests';
import type { RequestAction } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface RejectUnverifiedIdentifiersCommandFlags {
  auth: string;
  identifierNames: string[];
  actions?: RequestAction[];
  transcendUrl: string;
}

export async function rejectUnverifiedIdentifiers(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    identifierNames,
    actions = [],
  }: RejectUnverifiedIdentifiersCommandFlags,
): Promise<void> {
  doneInputValidation();

  await removeUnverifiedRequestIdentifiers({
    requestActions: actions,
    transcendUrl,
    auth,
    identifierNames,
  });
}
