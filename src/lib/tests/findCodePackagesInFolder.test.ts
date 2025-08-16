/* eslint-disable max-lines */
import { expect, describe, it } from 'vitest';

import { findCodePackagesInFolder } from '../code-scanning/findCodePackagesInFolder';
import { join } from 'node:path';
import type { CodePackageInput } from '../../codecs';

const expected: CodePackageInput[] = [
  {
    name: 'YourAppTargetName',
    type: 'COCOA_PODS',
    softwareDevelopmentKits: [
      {
        name: 'Braze-iOS-SDK',
        version: undefined,
      },
      {
        name: 'Branch',
        version: undefined,
      },
      {
        name: 'Firebase/Analytics',
        version: undefined,
      },
      {
        name: 'Mixpanel',
        version: undefined,
      },
      {
        name: 'Amplitude-iOS',
        version: '8.0',
      },
      {
        name: 'Google-Mobile-Ads-SDK',
        version: undefined,
      },
      {
        name: 'FacebookAdsSDK',
        version: undefined,
      },
      {
        name: 'MoPub-SDK',
        version: undefined,
      },
      {
        name: 'Alamofire',
        version: '5.2',
      },
      {
        name: 'SDWebImage',
        version: undefined,
      },
      {
        name: 'AppsFlyerFramework',
        version: undefined,
      },
      {
        name: 'Adjust',
        version: undefined,
      },
      {
        name: 'Flurry-iOS-SDK/FlurrySDK',
        version: undefined,
      },
    ],
    relativePath: 'test-cocoa-pods/Podfile',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'ExampleBootstrap',
    type: 'COCOA_PODS',
    softwareDevelopmentKits: [
      {
        name: 'ExampleLib',
        version: undefined,
      },
      {
        name: 'AppsFlyerFramework',
        version: undefined,
      },
      {
        name: 'Adjust',
        version: undefined,
      },
      {
        name: 'Flurry-iOS-SDK/FlurrySDK',
        version: undefined,
      },
    ],
    relativePath: 'test-requirements-txt/nested-cocoapods/Podfile',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'ExampleBootstrapTests',
    type: 'COCOA_PODS',
    softwareDevelopmentKits: [
      {
        name: 'ExampleLib',
        version: undefined,
      },
      {
        name: 'Braze-iOS-SDK',
        version: undefined,
      },
      {
        name: 'Branch',
        version: undefined,
      },
      {
        name: 'Firebase/Analytics',
        version: undefined,
      },
      {
        name: 'Mixpanel',
        version: undefined,
      },
      {
        name: 'Amplitude-iOS',
        version: '8.0',
      },
    ],
    relativePath: 'test-requirements-txt/nested-cocoapods/Podfile',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'Acme',
    relativePath: 'test-requirements-txt/nested-cocoapods-2/Podfile',
    repositoryName: 'transcend-io/cli',
    softwareDevelopmentKits: [
      {
        name: 'RZVinyl',
        version: undefined,
      },
      {
        name: 'RZTransitions',
        version: undefined,
      },
      {
        name: 'SDWebImage',
        version: undefined,
      },
      {
        name: 'SwiftLint',
        version: undefined,
      },
    ],
    type: 'COCOA_PODS',
  },
  {
    name: 'AcmeTests',
    type: 'COCOA_PODS',
    softwareDevelopmentKits: [
      {
        name: 'RZVinyl',
        version: undefined,
      },
      {
        name: 'iOSSnapshotTestCase',
        version: undefined,
      },
      {
        name: 'SnapshotTesting',
        version: '1.8.1',
      },
    ],
    relativePath: 'test-requirements-txt/nested-cocoapods-2/Podfile',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'NotificationServiceExtension',
    relativePath: 'test-requirements-txt/nested-cocoapods-2/Podfile',
    repositoryName: 'transcend-io/cli',
    softwareDevelopmentKits: [],
    type: 'COCOA_PODS',
  },
  {
    name: 'com.yourcompany.yourapp',
    softwareDevelopmentKits: [
      {
        name: 'androidx.appcompat',
        version: '1.2.0',
      },
      {
        name: 'androidx.constraintlayout',
        version: '2.0.4',
      },
      {
        name: 'com.appboy',
        version: '14.0.0',
      },
      {
        name: 'io.branch.sdk.android',
        version: '5.0.1',
      },
      {
        name: 'com.google.firebase',
        version: '18.0.0',
      },
      {
        name: 'com.google.android.gms',
        version: '19.7.0',
      },
      {
        name: 'com.facebook.android',
        version: '6.2.0',
      },
      {
        name: 'com.mixpanel.android',
        version: '5.8.7',
      },
      {
        name: 'com.amplitude',
        version: '2.30.0',
      },
      {
        name: 'com.squareup.retrofit2',
        version: '2.9.0',
      },
      {
        name: 'com.squareup.okhttp3',
        version: '4.9.0',
      },
      {
        name: 'com.squareup.picasso',
        version: '2.71828',
      },
      {
        name: 'org.eclipse.jdt.core',
        version: '3.28.0',
      },
      {
        name: 'com.android.application',
        version: undefined,
      },
      {
        name: 'com.google.gms.google-services',
        version: undefined,
      },
    ],
    relativePath: 'test-gradle/build.gradle',
    type: 'GRADLE',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: '@test-example/test',
    description: 'Example npm package.',
    softwareDevelopmentKits: [
      {
        name: 'dd-trace',
        version: '2.45.1',
      },
      {
        name: 'fast-csv',
        version: '^4.3.6',
      },
      {
        name: 'sequelize',
        version: '^6.37.3',
      },
      {
        name: 'sequelize-mock',
        version: '^0.10.2',
      },
      {
        isDevDependency: true,
        name: '@types/sequelize',
        version: '^4.28.20',
      },
      {
        name: 'typescript',
        version: '^5.0.4',
        isDevDependency: true,
      },
    ],
    relativePath: 'test-package-json/package.json',
    type: 'PACKAGE_JSON',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: '@test-example/nested-test',
    description: 'Example npm nested package.',
    softwareDevelopmentKits: [
      {
        name: 'dd-trace',
        version: '2.45.1',
      },
      {
        name: 'fast-csv',
        version: '^4.3.6',
      },
      {
        name: 'typescript',
        version: '^5.0.4',
        isDevDependency: true,
      },
    ],
    relativePath: 'test-gradle/test-nested-package-json/package.json',
    type: 'PACKAGE_JSON',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'test_requirements_txt',
    type: 'REQUIREMENTS_TXT',
    description: 'A sample Python package',
    softwareDevelopmentKits: [
      {
        name: 'pyarrow',
        version: '14.0.1',
      },
      {
        name: 'cryptography',
        version: '41.0.6',
      },
      {
        name: 'Flask',
        version: '2.2.5',
      },
      {
        name: 'cachetools',
        version: '5.3.0',
      },
    ],
    relativePath: 'test-requirements-txt/requirements.txt',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'test-nested-requirements-txt',
    type: 'REQUIREMENTS_TXT',
    description: undefined,
    softwareDevelopmentKits: [
      {
        name: 'pyarrow',
        version: '14.0.1',
      },
      {
        name: 'pandas',
        version: '2.0.3',
      },
    ],
    relativePath:
      'test-package-json/test-nested-requirements-txt/requirements.txt',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'test-gemfile',
    type: 'GEMFILE',
    description: undefined,
    softwareDevelopmentKits: [
      {
        name: 'rails',
        version: '~> 6.1.4',
      },
      {
        name: 'ahoy_matey',
        version: undefined,
      },
      {
        name: 'rack-tracker',
        version: undefined,
      },
      {
        name: 'adroll',
        version: undefined,
      },
      {
        name: 'google-ads-googleads',
        version: undefined,
      },
      {
        name: 'facebookads',
        version: undefined,
      },
      {
        name: 'devise',
        version: undefined,
      },
      {
        name: 'impressionist',
        version: undefined,
      },
      {
        name: 'sidekiq',
        version: undefined,
      },
      {
        name: 'sidekiq-cron',
        version: '~> 1.2',
      },
      {
        name: 'byebug',
        version: undefined,
      },
      {
        name: 'listen',
        version: '~> 3.3',
      },
      {
        name: 'capybara',
        version: '>= 2.15',
      },
      {
        name: 'selenium-webdriver',
        version: undefined,
      },
      {
        name: 'webdrivers',
        version: undefined,
      },
      {
        name: 'bundler-audit',
        version: undefined,
      },
    ],
    relativePath: 'test-gemfile/Gemfile',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'test-nested-gemfile',
    type: 'GEMFILE',
    softwareDevelopmentKits: [
      {
        name: 'rails',
        version: '~> 6.1.4',
      },
      {
        name: 'ahoy_matey',
        version: undefined,
      },
      {
        name: 'rack-tracker',
        version: undefined,
      },
      {
        name: 'adroll',
        version: undefined,
      },
      {
        name: 'google-ads-googleads',
        version: undefined,
      },
      {
        name: 'facebookads',
        version: undefined,
      },
      {
        name: 'byebug',
        version: undefined,
      },
      {
        name: 'listen',
        version: '~> 3.3',
      },
      {
        name: 'capybara',
        version: '>= 2.15',
      },
      {
        name: 'selenium-webdriver',
        version: undefined,
      },
      {
        name: 'webdrivers',
        version: undefined,
      },
      {
        name: 'bundler-audit',
        version: undefined,
      },
    ],
    description: undefined,
    relativePath: 'test-gradle/test-nested-gemfile/Gemfile',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'example',
    description: 'test example app',
    type: 'PUBSPEC',
    softwareDevelopmentKits: [
      {
        name: 'flutter',
        version: 'flutter',
      },
      {
        name: 'flutter_localizations',
        version: 'flutter',
      },
      {
        name: 'firebase_core',
        version: '2.16.0',
      },
      {
        name: 'firebase_analytics',
        version: '10.5.0',
      },
      {
        name: 'firebase_crashlytics',
        version: '3.3.6',
      },
      {
        name: 'video_player',
        version: '2.6.1',
      },
      {
        name: 'appsflyer_sdk',
        version: '6.12.2',
      },
      {
        name: 'isolate',
        version: '2.1.1',
      },
      {
        name: 'custom_platform_device_id',
        version: '1.0.8',
      },
      {
        name: 'image_editor',
        version: '1.3.0',
      },
      {
        name: 'firebase_remote_config',
        version: '4.2.6',
      },
      {
        name: 'intercom_flutter',
        version: '7.8.4',
      },
      {
        name: 'dismissible_page',
        version: '1.0.2',
      },
      {
        name: 'extended_text',
        version: '11.1.0',
      },
      {
        name: 'recaptcha_enterprise_flutter',
        version: '18.3.0',
      },
      {
        name: 'flutter_test',
        version: 'flutter',
        isDevDependency: true,
      },
      {
        name: 'test',
        version: '1.24.3',
        isDevDependency: true,
      },
      {
        name: 'lints',
        version: '3.0.0',
        isDevDependency: true,
      },
      {
        name: 'mocktail',
        version: '1.0.1',
        isDevDependency: true,
      },
    ],
    relativePath: 'test-pubspec/pubspec.yml',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'composer/example',
    description: 'Example app',
    softwareDevelopmentKits: [
      {
        name: 'php',
        version: '^7.2.5 || ^8.0',
      },
      {
        name: 'composer/ca-bundle',
        version: '^1.5',
      },
      {
        name: 'composer/class-map-generator',
        version: '^1.3.3',
      },
      {
        name: 'composer/metadata-minifier',
        version: '^1.0',
      },
      {
        name: 'composer/semver',
        version: '^3.3',
      },
      {
        name: 'composer/spdx-licenses',
        version: '^1.5.7',
      },
      {
        name: 'composer/xdebug-handler',
        version: '^2.0.2 || ^3.0.3',
      },
      {
        name: 'justinrainbow/json-schema',
        version: '^5.3',
      },
      {
        name: 'psr/log',
        version: '^1.0 || ^2.0 || ^3.0',
      },
      {
        name: 'seld/jsonlint',
        version: '^1.4',
      },
      {
        name: 'seld/phar-utils',
        version: '^1.2',
      },
      {
        name: 'symfony/console',
        version: '^5.4.35 || ^6.3.12 || ^7.0.3',
      },
      {
        name: 'symfony/filesystem',
        version: '^5.4.35 || ^6.3.12 || ^7.0.3',
      },
      {
        name: 'symfony/finder',
        version: '^5.4.35 || ^6.3.12 || ^7.0.3',
      },
      {
        name: 'symfony/process',
        version: '^5.4.35 || ^6.3.12 || ^7.0.3',
      },
      {
        name: 'react/promise',
        version: '^3.2',
      },
      {
        name: 'composer/pcre',
        version: '^2.2 || ^3.2',
      },
      {
        name: 'symfony/polyfill-php73',
        version: '^1.24',
      },
      {
        name: 'symfony/polyfill-php80',
        version: '^1.24',
      },
      {
        name: 'symfony/polyfill-php81',
        version: '^1.24',
      },
      {
        name: 'seld/signal-handler',
        version: '^2.0',
      },
      {
        name: 'symfony/phpunit-bridge',
        version: '^6.4.3 || ^7.0.1',
        isDevDependency: true,
      },
      {
        name: 'phpstan/phpstan',
        version: '^1.11.8',
        isDevDependency: true,
      },
      {
        name: 'phpstan/phpstan-phpunit',
        version: '^1.4.0',
        isDevDependency: true,
      },
      {
        name: 'phpstan/phpstan-deprecation-rules',
        version: '^1.2.0',
        isDevDependency: true,
      },
      {
        name: 'phpstan/phpstan-strict-rules',
        version: '^1.6.0',
        isDevDependency: true,
      },
      {
        name: 'phpstan/phpstan-symfony',
        version: '^1.4.0',
        isDevDependency: true,
      },
    ],
    relativePath: 'test-php/composer.json',
    type: 'COMPOSER_JSON',
    repositoryName: 'transcend-io/cli',
  },
  {
    name: 'test-swift',
    type: 'SWIFT',
    relativePath: 'test-swift/Package.resolved',
    repositoryName: 'transcend-io/cli',
    softwareDevelopmentKits: [
      {
        name: 'alamofire',
        version: '5.8.1',
      },
      {
        name: 'swift-numerics',
        version: '1.0.2',
      },
    ],
  },
];

/**
 * Sort code packages by name
 *
 * @param codePackages - Code packages to sort
 * @returns Sorted code packages
 */
function sortCodePackages(
  codePackages: CodePackageInput[],
): CodePackageInput[] {
  return codePackages
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      ...c,
      softwareDevelopmentKits: c.softwareDevelopmentKits?.sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }));
}

// not easy to test this but can uncomment to run against current commit
describe('findCodePackagesInFolder', () => {
  it('should remove links', async () => {
    const result = await findCodePackagesInFolder({
      repositoryName: 'transcend-io/cli',
      scanPath: join(__dirname, '../../../examples/code-scanning'),
    });
    expect(sortCodePackages(result)).to.deep.equal(sortCodePackages(expected));
  });
});
/* eslint-enable max-lines */
