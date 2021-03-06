import { readFileSync } from 'fs';
import { SiloDiscoveryConfig } from '../types';

/**
 * So far, there is two ways of defining dependancies that is supported
 * implementation group: 'org.eclipse.jdt', name: 'org.eclipse.jdt.core', version: '3.28.0'
 * or
 * "org.eclipse.jgit:org.eclipse.jgit:4.9.2.201712150930-r"
 * where the middle is the name of the dependency
 *
 */
const regex = [/:(.\S*):/, /name: ?'(.*?)'/];

export const gradle: SiloDiscoveryConfig = {
  supportedFiles: ['build.gradle', 'build.gradle.kts'],
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
      const rExp = regex.find((reg) => new RegExp(reg, 'g').test(line));
      if (rExp != null) {
        const dep = rExp.exec(line) as RegExpExecArray;
        deps.push(dep[1]);
      }
      return line;
    });
    return deps;
  },
};
