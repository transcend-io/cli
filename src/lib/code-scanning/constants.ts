import { CodePackageType } from '@transcend-io/privacy-types';
import {
  cocoaPods,
  composerJson,
  gemfile,
  gradle,
  javascriptPackageJson,
  pubspec,
  pythonRequirementsTxt,
  swift,
} from './integrations';
import { CodeScanningConfig } from './types';

/**
 * @deprecated TODO: https://transcend.height.app/T-32325 - use code scanning instead
 */
export const SILO_DISCOVERY_CONFIGS: Record<string, CodeScanningConfig> = {
  cocoaPods,
  gradle,
  javascriptPackageJson,
  pythonRequirementsTxt,
  gemfile,
  pubspec,
  swift,
};

export const CODE_SCANNING_CONFIGS: Record<
  CodePackageType,
  CodeScanningConfig
> = {
  [CodePackageType.CocoaPods]: cocoaPods,
  [CodePackageType.Gradle]: gradle,
  [CodePackageType.PackageJson]: javascriptPackageJson,
  [CodePackageType.RequirementsTxt]: pythonRequirementsTxt,
  [CodePackageType.Gemfile]: gemfile,
  [CodePackageType.Pubspec]: pubspec,
  [CodePackageType.ComposerJson]: composerJson,
  [CodePackageType.Swift]: swift,
};
