import type { LocalContext } from '../../../../context';
import colors from 'colors';
import * as t from 'io-ts';

import { logger } from '../../../../logger';
import { markRequestDataSiloIdsCompleted } from '../../../../lib/cron';
import { readCsv } from '../../../../lib/requests';

const RequestIdRow = t.type({
  'Request Id': t.string,
});

export interface MarkRequestDataSilosCompletedCommandFlags {
  auth: string;
  dataSiloId: string;
  file: string;
  transcendUrl: string;
}

export async function markRequestDataSilosCompleted(
  this: LocalContext,
  {
    auth,
    dataSiloId,
    file,
    transcendUrl,
  }: MarkRequestDataSilosCompletedCommandFlags,
): Promise<void> {
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, RequestIdRow);

  await markRequestDataSiloIdsCompleted({
    requestIds: activeResults.map((request) => request['Request Id']),
    transcendUrl,
    auth,
    dataSiloId,
  });
}
