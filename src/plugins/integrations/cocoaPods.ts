import { readFileSync } from 'fs';
import { SiloDiscoveryConfig, SiloDiscoveryRawInput } from '../types';

const SPECIAL_CASE_MAP: Record<string, string | undefined> = {};

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

    const deps: SiloDiscoveryRawInput[] = [];

    lines.map((line) => {
      if (regex.test(line)) {
        const dep = podRegex.exec(line) as RegExpExecArray;
        deps.push({
          name: dep[1],
          type: SPECIAL_CASE_MAP[dep[1]],
        });
      }
      return deps;
    });
    return deps;
  },
};
