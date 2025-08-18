// src/commands/classify/unstructured/readme.ts
import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { ClassifyUnstructuredFlags } from './impl';

const examples = buildExamples<ClassifyUnstructuredFlags>(
  ['admin', 'classify-unstructured'],
  [
    {
      description: 'Redact a folder with defaults (output to <dir>/redacted)',
      flags: {
        directory: './working/unstructured',
        auth: 'transcend-xxxx',
      },
    },
    {
      description:
        'Self-hosted Sombra: include Sombra auth and your gateway URL',
      flags: {
        directory: './working/unstructured',
        outputDir: './working/redacted',
        auth: 'transcend-xxxx',
        sombraAuth: 'sombra-xxxx',
      },
    },
    {
      description: 'Use the US backend',
      flags: {
        directory: './working/unstructured',
        transcendUrl: 'https://api.us.transcend.io',
        auth: 'transcend-xxxx',
      },
    },
    {
      description: 'Increase batching and worker pool size',
      flags: {
        directory: './working/unstructured',
        outputDir: './working/redacted',
        auth: 'transcend-xxxx',
        batchSize: 100,
        concurrency: 4,
      },
    },
    {
      description: 'Write sidecar off (only redacted files)',
      flags: {
        directory: './working/unstructured',
        transcendUrl: 'https://api.transcend.io',
        auth: 'transcend-xxxx',
        writeSidecar: false,
      },
    },
    {
      description: 'Viewer mode (non-interactive dashboard)',
      flags: {
        directory: './working/unstructured',
        transcendUrl: 'https://api.transcend.io',
        auth: 'transcend-xxxx',
        viewerMode: true,
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
