import { readFileSync } from 'fs';
import { SiloDiscoveryConfig } from '../types';

const podRegex = /pod '(.*?)'/;
const regex = new RegExp(podRegex, 'g');
export const cocoaPods: SiloDiscoveryConfig = {
  supportedFiles: ['Podfile'],
  ignoreDirs: ['Pods'],
  scanFunction: (filePath) => {
    const lines = readFileSync(filePath)
      .toString()
      // split on new line character
      .split(String.fromCharCode(10));

    const deps: string[] = [];

    lines.map((line) => {
      if (regex.test(line)) {
        const dep = podRegex.exec(line) as RegExpExecArray;
        deps.push(dep[1]);
      }
      return deps;
    });
    return deps;
  },
};
