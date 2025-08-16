import { readFileSync } from 'node:fs';
import { CodeScanningConfig } from '../types';
import { findAllWithRegex } from '@transcend-io/type-utils';
import { dirname } from 'node:path';

const GRADLE_IMPLEMENTATION_REGEX =
  /implementation( *)('|")(.+?):(.+?):(.+?|)('|")/;
const GRADLE_PLUGIN_REGEX = /apply plugin: *('|")(.+?)(:(.+?)|)('|")/;
const GRADLE_IMPLEMENTATION_GROUP_REGEX =
  /implementation group:( *)('|")(.+?)('|"),( *)name:( *)('|")(.+?)('|"),( *)version:( *)('|")(.+?)('|")/;
const GRADLE_APPLICATION_NAME_REGEX = /applicationId( *)"(.+?)"/;

/**
 * So far, there are three ways of defining dependencies that is supported
 * implementation group: 'org.eclipse.jdt', name: 'org.eclipse.jdt.core', version: '3.28.0'
 * or
 * implementation 'com.google.firebase:firebase-analytics:18.0.0'
 * or
 * apply plugin: 'com.google.gms.google-services'
 *
 * single and double quotes are both recognized
 */
export const gradle: CodeScanningConfig = {
  supportedFiles: ['build.gradle**'],
  ignoreDirs: [
    'gradle-app.setting',
    'gradle-wrapper.jar',
    'gradle-wrapper.properties',
  ],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, 'utf-8');
    const directory = dirname(filePath);

    const targets = findAllWithRegex(
      {
        value: new RegExp(GRADLE_IMPLEMENTATION_REGEX, 'g'),
        matches: ['space', 'quote1', 'name', 'node:path', 'version', 'quote2'],
      },
      fileContents,
    );
    const targetPlugins = findAllWithRegex(
      {
        value: new RegExp(GRADLE_PLUGIN_REGEX, 'g'),
        matches: ['quote1', 'name', 'group', 'version', 'quote2'],
      },
      fileContents,
    );
    const targetGroups = findAllWithRegex(
      {
        value: new RegExp(GRADLE_IMPLEMENTATION_GROUP_REGEX, 'g'),
        matches: [
          'space1',
          'quote1',
          'group',
          'quote2',
          'space2',
          'space3',
          'quote3',
          'name',
          'quote4',
          'space4',
          'space5',
          'quote5',
          'version',
          'quote6',
        ],
      },
      fileContents,
    );
    const applications = findAllWithRegex(
      {
        value: new RegExp(GRADLE_APPLICATION_NAME_REGEX, 'g'),
        matches: ['space', 'name'],
      },
      fileContents,
    );
    if (applications.length > 1) {
      throw new Error(`Expected only one applicationId per file: ${filePath}`);
    }

    return [
      {
        name: applications[0]?.name || directory.split('/').pop()!,
        softwareDevelopmentKits: [
          ...targets,
          ...targetGroups,
          ...targetPlugins,
        ].map((target) => ({
          name: target.name,
          version: target.version || undefined,
        })),
      },
    ];
  },
};
