import { CodeScanningConfig } from './types';
import {
  cocoaPods,
  gradle,
  javascriptPackageJson,
  gemfile,
  pubspec,
  pythonRequirementsTxt,
} from './integrations';
import { CodePackageType } from '@transcend-io/privacy-types';

/**
 * @deprecated TODO: https://transcend.height.app/T-32325 - use code scanning instead
 */
export const SILO_DISCOVERY_CONFIGS: {
  [k in string]: CodeScanningConfig;
} = {
  cocoaPods,
  gradle,
  javascriptPackageJson,
  pythonRequirementsTxt,
  gemfile,
  pubspec,
};

export const CODE_SCANNING_CONFIGS: {
  [k in CodePackageType]: CodeScanningConfig;
} = {
  [CodePackageType.CocoaPods]: cocoaPods,
  [CodePackageType.Gradle]: gradle,
  [CodePackageType.PackageJson]: javascriptPackageJson,
  [CodePackageType.RequirementsTxt]: pythonRequirementsTxt,
  [CodePackageType.Gemfile]: gemfile,
  [CodePackageType.Pubspec]: pubspec,
};
