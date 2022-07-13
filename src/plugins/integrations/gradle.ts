import { readFileSync } from 'fs';
import { SiloDiscoveryConfig } from '../types';

export const pythonRequirementsTxt: SiloDiscoveryConfig = {
  supportedFiles: ['build.gradle'],
  ignoreDirs: [
    'gradle-app.setting',
    'gradle-wrapper.jar',
    'gradle-wrapper.properties',
  ],
  scanFunction: (filePath) => {
    const lines = readFileSync(filePath)
      .toString()
      // split on new line character
      .split(String.fromCharCode(10));

    const deps: string[] = [];

    lines.map((line) => {
      
    });

    return deps;
  },
};
