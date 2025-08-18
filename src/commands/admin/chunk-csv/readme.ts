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
    {
      description: 'Viewer mode - no ability to switch between files',
      flags: {
        directory: './working/files',
        outputDir: './working/chunks',
        viewerMode: true,
      },
    },
    {
      description: 'Clear output directory before writing chunks',
      flags: {
        directory: './working/files',
        outputDir: './working/chunks',
        clearOutputDir: true,
      },
    },
    {
      description: 'Run with all options',
      flags: {
        directory: './working/files',
        outputDir: './working/chunks',
        chunkSizeMB: 100,
        concurrency: 2,
        viewerMode: false,
        clearOutputDir: true,
      },
    },
    {
      description:
        'Run with no output directory specified (defaults to input directory)',
      flags: {
        directory: './working/files',
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
