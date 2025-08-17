import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ChunkCsvCommandFlags } from './impl';

const examples = buildExamples<ChunkCsvCommandFlags>(
  ['admin', 'chunk-csv'],
  [
    {
      description: 'Chunk a file into smaller CSV files',
      flags: {
        inputFile: './working/full_export.csv',
        outputDir: './working/chunks',
      },
    },
    {
      description: 'Specify chunk size in MB',
      flags: {
        inputFile: './working/full_export.csv',
        outputDir: './working/chunks',
        chunkSizeMB: 250,
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
