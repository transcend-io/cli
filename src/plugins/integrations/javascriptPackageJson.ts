import { readFileSync } from 'fs';
import { SiloDiscoveryConfig } from '../types';

const SPECIAL_CASE_MAP: Record<string, string | undefined> = {
  dogapi: 'datadog',
  'dd-trace': 'datadog',
};

export const javascriptPackageJson: SiloDiscoveryConfig = {
  supportedFiles: ['package.json'],
  ignoreDirs: ['node_modules', 'serverless-build', 'lambda-build'],
  scanFunction: (filePath) => {
    const file = readFileSync(filePath, 'utf-8');
    const asJson = JSON.parse(file);
    const {
      dependencies = {},
      devDependencies = {},
      optionalDependencies = {},
    } = asJson;
    return [
      ...dependencies.map((dep: string) => ({
        name: dep,
        type: SPECIAL_CASE_MAP[dep],
      })),
      ...devDependencies.map((dep: string) => ({
        name: dep,
        type: SPECIAL_CASE_MAP[dep],
      })),
      ...optionalDependencies.map((dep: string) => ({
        name: dep,
        type: SPECIAL_CASE_MAP[dep],
      })),
    ];
  },
};
