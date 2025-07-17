import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['examples/**/*', 'src/commands/**/readme.ts'],
  ignoreDependencies: ['doctoc'],
};

export default config;
