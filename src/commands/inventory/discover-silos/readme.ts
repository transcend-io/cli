import { buildExamples } from '../../../lib/docgen/buildExamples';
import type { DiscoverSilosCommandFlags } from './impl';

const examples = buildExamples<DiscoverSilosCommandFlags>(
  ['inventory', 'discover-silos'],
  [
    {
      description: 'Scan a JavaScript package.json',
      flags: {
        scanPath: './myJavascriptProject',
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '445ee241-5f2a-477b-9948-2a3682a43d0e',
      },
    },
    {
      description:
        'Scan multiple file types (Podfile, Gradle, etc.) in examples directory',
      flags: {
        scanPath: './examples/',
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: 'b6776589-0b7d-466f-8aad-4378ffd3a321',
      },
    },
  ],
);

export default `#### Examples

${examples}

This call will look for all the package.json files in the scan path \`./myJavascriptProject\`, parse each of the dependencies into their individual package names, and send it to our Transcend backend for classification. These classifications can then be viewed [here](https://app.transcend.io/data-map/data-inventory/silo-discovery/triage). The process is the same for scanning requirements.txt, podfiles and build.gradle files.

Here are some examples of a [Podfile](./examples/code-scanning/test-cocoa-pods/Podfile) and [Gradle file](./examples/code-scanning/test-gradle/build.gradle).`;
