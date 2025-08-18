import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ChunkCsvCommandFlags } from './impl';

const examples = buildExamples<ChunkCsvCommandFlags>(
  ['admin', 'chunk-csv'],
  [
    {
      description: 'Chunk a file into smaller CSV files',
      flags: {
        directory: './working/files',
        outputDir: './working/chunks',
      },
    },
    {
      description: 'Specify chunk size in MB',
      flags: {
        directory: './working/files',
        outputDir: './working/chunks',
        chunkSizeMB: 250,
      },
    },
    {
      description: 'Specify concurrency (pool size)',
      flags: {
        directory: './working/files',
        outputDir: './working/chunks',
        concurrency: 4,
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
