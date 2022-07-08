import { readFileSync } from 'fs';
import { SiloDiscoveryConfig } from '../types';

export const pythonRequirementsTxt: SiloDiscoveryConfig = {
  supportedFiles: ['requirements.txt'],
  ignoreDirs: ['node_modules', 'serverless-build', 'lambda-build'],
  scanFunction: (filePath) => {
    const lines = readFileSync(filePath)
      .toString()
      // split on new line character
      .split(String.fromCharCode(10));

    const deps: string[] = [];

    lines.map((line) => {
      if (line.includes('==')) {
        const dep = line.split('==')[0];
        if (!dep.includes('#')) {
          deps.push(dep);
        }
      }
      return deps;
    });

    return deps;
  },
};
