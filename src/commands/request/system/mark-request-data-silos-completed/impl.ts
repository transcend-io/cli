import colors from 'colors';
import * as t from 'io-ts';
import type { LocalContext } from '../../../../context';
import { markRequestDataSiloIdsCompleted } from '../../../../lib/cron';
import { readCsv } from '../../../../lib/requests';
import { logger } from '../../../../logger';

const RequestIdRow = t.type({
  'Request Id': t.string,
});

interface MarkRequestDataSilosCompletedCommandFlags {
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
