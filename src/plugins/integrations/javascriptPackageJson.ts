import { readFileSync } from 'fs';
import { SiloDiscoveryConfig } from '../types';

const SPECIAL_CASE_MAP: Record<string, string | undefined> = {};

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
      ...Object.keys(
        dependencies.map((dep: string) =>
          SPECIAL_CASE_MAP[dep] === undefined
            ? dep
            : (SPECIAL_CASE_MAP[dep] as string),
        ),
      ),
      ...Object.keys(
        devDependencies.map((dep: string) =>
          SPECIAL_CASE_MAP[dep] === undefined
            ? dep
            : (SPECIAL_CASE_MAP[dep] as string),
        ),
      ),
      ...Object.keys(
        optionalDependencies.map((dep: string) =>
          SPECIAL_CASE_MAP[dep] === undefined
            ? dep
            : (SPECIAL_CASE_MAP[dep] as string),
        ),
      ),
    ];
  },
};
