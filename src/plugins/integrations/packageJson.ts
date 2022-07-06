import { SiloDiscoveryConfig } from '../types';

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
      ...Object.keys(dependencies),
      ...Object.keys(devDependencies),
      ...Object.keys(optionalDependencies),
    ];
  },
};
