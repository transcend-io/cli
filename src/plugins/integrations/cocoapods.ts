import { SiloDiscoveryConfig } from '../types';

export const cocoapods: SiloDiscoveryConfig = {
  supportedFiles: ['package.json'],
  ignoreDirs: ['node_modules', 'serverless-build', 'lambda-build'],
  scanFunction: () => [],
};
