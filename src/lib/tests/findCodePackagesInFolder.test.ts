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
    name: 'transcend.xcodeproj',
    relativePath:
      'test-swift/transcend.xcworkspace/transcend.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved',
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
    type: 'SWIFT',
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
    name: 'test-kotlin',
    relativePath: 'test-kotlin/build.gradle.kts',
    repositoryName: 'transcend-io/cli',
    softwareDevelopmentKits: [],
    type: 'GRADLE',
  },
  {
    name: 'test-kotlin',
    relativePath: 'test-kotlin/build.gradle.kts',
    repositoryName: 'transcend-io/cli',
    softwareDevelopmentKits: [
      {
        name: 'androidx.credentials:credentials',
        version: undefined,
      },
      {
        name: 'androidx.hilt:hilt-navigation-compose',
        version: undefined,
      },
      {
        name: 'androidx.hilt:hilt-work',
        version: undefined,
      },
      {
        name: 'androidx.localbroadcastmanager:localbroadcastmanager',
        version: undefined,
      },
      {
        name: 'androidx.media3:media3-exoplayer',
        version: undefined,
      },
      {
        name: 'androidx.media3:media3-exoplayer-dash',
        version: undefined,
      },
      {
        name: 'androidx.media3:media3-exoplayer-ima',
        version: undefined,
      },
      {
        name: 'androidx.media3:media3-ui',
        version: undefined,
      },
      {
        name: 'androidx.profileinstaller:profileinstaller',
        version: undefined,
      },
      {
        name: 'androidx.test.espresso:espresso-contrib',
        version: undefined,
      },
      {
        name: 'androidx.test.espresso:espresso-core',
        version: undefined,
      },
      {
        name: 'androidx.test.espresso:espresso-intents',
        version: undefined,
      },
      {
        name: 'com.airbnb.android:lottie',
        version: undefined,
      },
      {
        name: 'com.android.application',
        version: undefined,
      },
      {
        name: 'com.android.installreferrer:installreferrer',
        version: undefined,
      },
      {
        name: 'com.appsflyer:af-android-sdk',
        version: undefined,
      },
      {
        name: 'com.braze:android-sdk-ui',
        version: undefined,
      },
      {
        name: 'com.facebook.android:facebook-android-sdk',
        version: undefined,
      },
      {
        name: 'com.facebook.android:facebook-applinks',
        version: undefined,
      },
      {
        name: 'com.facebook.android:facebook-login',
        version: undefined,
      },
      {
        name: 'com.facebook.android:facebook-share',
        version: undefined,
      },
      {
        name: 'com.foursquare:movementsdk',
        version: undefined,
      },
      {
        name: 'com.github.anrwatchdog:anrwatchdog',
        version: undefined,
      },
      {
        name: 'com.github.bumptech.glide:compiler',
        version: undefined,
      },
      {
        name: 'com.github.bumptech.glide:glide',
        version: undefined,
      },
      {
        name: 'com.github.bumptech.glide:ksp',
        version: undefined,
      },
      {
        name: 'com.github.bumptech.glide:okhttp3-integration',
        version: undefined,
      },
      {
        name: 'com.github.bumptech.glide:recyclerview-integration',
        version: undefined,
      },
      {
        name: 'com.github.chrisbanes:PhotoView',
        version: undefined,
      },
      {
        name: 'com.github.chuckerteam.chucker:library',
        version: undefined,
      },
      {
        name: 'com.github.chuckerteam.chucker:library-no-op',
        version: undefined,
      },
      {
        name: 'com.github.jinatonic.confetti:confetti',
        version: undefined,
      },
      {
        name: 'com.github.MasayukiSuda:EasingInterpolator',
        version: undefined,
      },
      {
        name: 'com.github.newrelic.video-agent-android:NewRelicVideoCore',
        version: undefined,
      },
      {
        name: 'com.github.newrelic.video-agent-android:NRExoPlayerTracker',
        version: undefined,
      },
      {
        name: 'com.github.newrelic.video-agent-android:NRIMATracker',
        version: undefined,
      },
      {
        name: 'com.google.android.gms:play-services-auth-api-phone',
        version: undefined,
      },
      {
        name: 'com.google.android.gms:play-services-maps',
        version: undefined,
      },
      {
        name: 'com.google.android.material:material',
        version: undefined,
      },
      {
        name: 'com.google.android.play:app-update',
        version: undefined,
      },
      {
        name: 'com.google.android.play:asset-delivery',
        version: undefined,
      },
      {
        name: 'com.google.android.play:feature-delivery',
        version: undefined,
      },
      {
        name: 'com.google.android.play:review',
        version: undefined,
      },
      {
        name: 'com.google.api-client:google-api-client-android',
        version: undefined,
      },
      {
        name: 'com.google.apis:google-api-services-gmail',
        version: undefined,
      },
      {
        name: 'com.google.code.findbugs:jsr305',
        version: undefined,
      },
      {
        name: 'com.google.devtools.ksp',
        version: undefined,
      },
      {
        name: 'com.google.firebase:firebase-perf',
        version: undefined,
      },
      {
        name: 'com.google.firebase.crashlytics',
        version: undefined,
      },
      {
        name: 'com.google.firebase.firebase-perf',
        version: undefined,
      },
      {
        name: 'com.google.gms.google-services',
        version: undefined,
      },
      {
        name: 'com.google.guava:guava',
        version: undefined,
      },
      {
        name: 'com.google.http-client:google-http-client-gson',
        version: undefined,
      },
      {
        name: 'com.google.zxing:core',
        version: undefined,
      },
      {
        name: 'com.googlecode.json-simple:json-simple',
        version: undefined,
      },
      {
        name: 'com.microblink.blinkreceipt:blinkreceipt-account-linking',
        version: undefined,
      },
      {
        name: 'com.microblink.blinkreceipt:blinkreceipt-bom',
        version: undefined,
      },
      {
        name: 'com.microblink.blinkreceipt:blinkreceipt-recognizer',
        version: undefined,
      },
      {
        name: 'com.newrelic.agent.android:android-agent',
        version: undefined,
      },
      {
        name: 'com.scandit.datacapture:barcode',
        version: undefined,
      },
      {
        name: 'com.scandit.datacapture:core',
        version: undefined,
      },
      {
        name: 'com.siftscience:sift-android',
        version: undefined,
      },
      {
        name: 'com.sun.mail:android-activation',
        version: undefined,
      },
      {
        name: 'com.sun.mail:android-mail',
        version: undefined,
      },
      {
        name: 'com.usebutton:android-sdk',
        version: undefined,
      },
      {
        name: 'com.wdullaer:materialdatetimepicker',
        version: undefined,
      },
      {
        name: 'dagger.hilt.android.plugin',
        version: undefined,
      },
      {
        name: 'io.mockk:mockk',
        version: undefined,
      },
      {
        name: 'jp.wasabeef:glide-transformations',
        version: undefined,
      },
      {
        name: 'kotlin-android',
        version: undefined,
      },
      {
        name: 'kotlin-kapt',
        version: undefined,
      },
      {
        name: 'net.toddm:androidcommframework',
        version: undefined,
      },
      {
        name: 'newrelic',
        version: undefined,
      },
      {
        name: 'org.apache.commons:commons-lang3',
        version: undefined,
      },
      {
        name: 'org.apache.httpcomponents:httpclient',
        version: undefined,
      },
      {
        name: 'org.javassist:javassist',
        version: undefined,
      },
      {
        name: 'org.jetbrains.kotlin.plugin.compose',
        version: undefined,
      },
      {
        name: 'org.json:json',
        version: undefined,
      },
      {
        name: 'org.mockito:mockito-core',
        version: undefined,
      },
      {
        name: 'org.mockito.kotlin:mockito-kotlin',
        version: undefined,
      },
    ],
    type: 'KOTLIN',
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
  {
    name: 'test-swift-v1',
    relativePath: 'test-swift/test-swift-v1/Package.resolved',
    repositoryName: 'transcend-io/cli',
    softwareDevelopmentKits: [
      {
        name: 'Apollo',
        version: '1.25.2',
      },
      {
        name: 'CwlCatchException',
        version: undefined,
      },
    ],
    type: 'SWIFT',
  },
  {
    name: 'transcend.xcworkspace',
    relativePath:
      'test-swift/transcend.xcworkspace/xcshareddata/swiftpm/Package.resolved',
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
    type: 'SWIFT',
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
