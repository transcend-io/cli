import { readFileSync } from 'fs';
import { SiloDiscoveryConfig } from '../types';

const SPECIAL_CASE_MAP: Record<string, string | undefined> = {
  boto: 'amazonWebServices',
  boto3: 'amazonWebServices',
};

export const pythonRequirementsTxt: SiloDiscoveryConfig = {
  supportedFiles: ['requirements.txt'],
  ignoreDirs: ['build', 'lib', 'lib64'],
  scanFunction: (filePath) => {
    const lines = readFileSync(filePath)
      .toString()
      // split on new line character
      .split(String.fromCharCode(10));

    const deps: string[] = [];

    lines.map((line) => {
      if (line.includes('==')) {
        const dep = line.split('==')[0];
        deps.push(
          SPECIAL_CASE_MAP[dep] === undefined
            ? dep
            : (SPECIAL_CASE_MAP[dep] as string),
        );
      }
      return deps;
    });

    return deps;
  },
};
