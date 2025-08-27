import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ParquetToCsvCommandFlags } from './impl';

const examples = buildExamples<ParquetToCsvCommandFlags>(
  ['admin', 'parquet-to-csv'],
  [
    {
      description: 'Convert all Parquet files in a directory to CSV',
      flags: {
        directory: './working/parquet',
        outputDir: './working/csv',
      },
    },
    {
      description: 'Limit worker pool concurrency',
      flags: {
        directory: './working/parquet',
        outputDir: './working/csv',
        concurrency: 4,
      },
    },
    {
      description: 'Viewer mode - non-interactive dashboard',
      flags: {
        directory: './working/parquet',
        outputDir: './working/csv',
        viewerMode: true,
      },
    },
    {
      description: 'Clear output directory before writing',
      flags: {
        directory: './working/parquet',
        outputDir: './working/csv',
        clearOutputDir: true,
      },
    },
    {
      description: 'Run with all options',
      flags: {
        directory: './working/parquet',
        outputDir: './working/csv',
        concurrency: 2,
        viewerMode: false,
        clearOutputDir: true,
      },
    },
    {
      description: 'Default output directory (writes next to each input file)',
      flags: {
        directory: './working/parquet',
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
