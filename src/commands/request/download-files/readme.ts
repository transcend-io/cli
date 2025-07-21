import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { DownloadFilesCommandFlags } from './impl';

const examples = buildExamples<DownloadFilesCommandFlags>(
  ['request', 'download-files'],
  [
    {
      description:
        'Download all requests in status=APPROVING or status=DOWNLOADABLE',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description:
        'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Write files to a specific folder on disk',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        folderPath: './my-folder',
      },
    },
    {
      description: 'Auto approve after download',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        approveAfterDownload: 'true',
      },
    },
    {
      description: 'Download requests in APPROVING state only',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        statuses: 'APPROVING',
      },
    },
    {
      description: 'Increase the concurrency (defaults to 10)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        concurrency: '100',
      },
    },
    {
      description: 'Download requests in a timeframe',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        createdAtBefore: '05/03/2023',
        createdAtAfter: '04/03/2023',
      },
    },
    {
      description: 'Download specific requests',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        requestIds:
          'b8c2ce13-9e40-4104-af79-23c68f2a87ba,d5eedc52-0f85-4034-bc01-14951acad5aa',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
