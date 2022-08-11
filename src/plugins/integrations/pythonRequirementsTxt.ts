import { readFileSync } from 'fs';
import { SiloDiscoveryRawInput } from '..';
import { SiloDiscoveryConfig } from '../types';

const SPECIAL_CASE_MAP: Record<string, string | undefined> = {
  boto: 'amazonWebServices',
  boto3: 'amazonWebServices',
  heapapi: 'heap',
};

export const pythonRequirementsTxt: SiloDiscoveryConfig = {
  supportedFiles: ['requirements.txt'],
  ignoreDirs: ['build', 'lib', 'lib64'],
  scanFunction: (filePath) => {
    const lines = readFileSync(filePath)
      .toString()
      // split on new line character
      .split(String.fromCharCode(10));

    const deps: SiloDiscoveryRawInput[] = [];

    lines.map((line) => {
      if (line.includes('==')) {
        const dep = line.split('==')[0];
        deps.push({
          name: dep,
          type: SPECIAL_CASE_MAP[dep],
        });
      }
      return deps;
    });

    return deps;
  },
};
