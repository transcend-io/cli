import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ScanPackagesCommandFlags } from './impl';

const examples = buildExamples<ScanPackagesCommandFlags>(
  ['inventory', 'scan-packages'],
  [
    {
      description: 'Scan the current directory',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Scan a specific directory',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        scanPath: './examples/',
      },
    },
    {
      description: 'Ignore certain folders',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        ignoreDirs: './test,./build',
      },
    },
    {
      description: 'Specify the name of the repository',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        repositoryName: 'transcend-io/test',
      },
    },
  ],
);

export default `#### Usage

${examples}`;
