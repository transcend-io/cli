import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CodeScanningConfig } from '../types';
import { findAllWithRegex } from '@transcend-io/type-utils';

/**
 * Kotlin DSL (build.gradle.kts) dependency & plugin parsing
 */

const KTS_DEP_CONFIGS =
  // eslint-disable-next-line max-len
  '(implementation|api|kapt|ksp|debugImplementation|releaseImplementation|androidTestImplementation|testImplementation|compileOnly|runtimeOnly)';

// e.g. implementation("com.google.firebase:firebase-analytics:18.0.0")
const KTS_DEP_STRING_COORDS_REGEX = new RegExp(
  `${KTS_DEP_CONFIGS}\\s*\\(\\s*["']([^"':\\s]+):([^"':\\s]+):?([^"']*)["']\\s*\\)`,
  'g',
);
// captures: [1]=config, [2]=group, [3]=artifact, [4]=version (may be '')

// e.g. implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
const KTS_DEP_PLATFORM_REGEX = new RegExp(
  `${KTS_DEP_CONFIGS}\\s*\\(\\s*platform\\(\\s*["']([^"':\\s]+):([^"':\\s]+):?([^"']*)["']\\s*\\)\\s*\\)`,
  'g',
);

// e.g. implementation(libs.androidx.appcompat) / implementation(libs["androidx-core-ktx"])
const KTS_DEP_LIBS_ALIAS_REGEX = new RegExp(
  `${KTS_DEP_CONFIGS}\\s*\\(\\s*libs(?:\\.[\\w\\-\\.]+|\\[["'][^"']+["']\\])\\s*\\)`,
  'g',
);

// Plugins:
//   plugins { id("com.google.gms.google-services") version "4.4.2" apply false }
//   plugins { id("org.jetbrains.kotlin.android") }
//   apply(plugin = "newrelic")
//   plugins { alias(libs.plugins.kotlin.android) }
const KTS_PLUGIN_ID_REGEX =
  /id\s*\(\s*["']([^"']+)["']\s*\)(?:\s*version\s*["']([^"']+)["'])?/g;
const KTS_PLUGIN_APPLY_REGEX =
  /apply\s*\(\s*plugin\s*=\s*["']([^"']+)["']\s*\)/g;
const KTS_PLUGIN_ALIAS_REGEX =
  /plugins\s*\{[^}]*alias\s*\(\s*libs(?:\.plugins)?(?:\.[\w\-.]+|\[["'][^"']+["']\])\s*\)[^}]*\}/g;

// applicationId in Kotlin DSL:
//   applicationId = "com.foo.bar"
//   applicationId("com.foo.bar")
const KTS_APPLICATION_ID_EQ_REGEX = /applicationId\s*=\s*["']([^"']+)["']/g;
const KTS_APPLICATION_ID_CALL_REGEX =
  /applicationId\s*\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Input dep entry (partial)
 */
type DepInput = {
  /** Name of the dependency */
  name: string;
  /** Version of the dependency */
  version?: string;
};

/**
 * Helper to normalize a parsed dep entry
 *
 * @param name - name
 * @param version - version
 * @returns normalized entry
 */
function depEntry(name: string, version?: string): DepInput {
  const v =
    version && version.trim().length > 0 && version !== '_'
      ? version.trim()
      : undefined;
  return { name, version: v };
}

export const kotlin: CodeScanningConfig = {
  supportedFiles: ['**/build.gradle.kts', '**/*.gradle.kts'],
  ignoreDirs: [
    'gradle-app.setting',
    'gradle-wrapper.jar',
    'gradle-wrapper.properties',
  ],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, 'utf-8');
    const directory = dirname(filePath);

    // ---------- applicationId ----------
    const appIds = [
      ...findAllWithRegex(
        { value: KTS_APPLICATION_ID_EQ_REGEX, matches: ['name'] },
        fileContents,
      ),
      ...findAllWithRegex(
        { value: KTS_APPLICATION_ID_CALL_REGEX, matches: ['name'] },
        fileContents,
      ),
    ];
    if (appIds.length > 1) {
      throw new Error(`Expected only one applicationId per file: ${filePath}`);
    }
    const appName = appIds[0]?.name || directory.split('/').pop()!;

    // ---------- dependencies ----------
    const deps: Array<DepInput> = [];

    // "group:artifact:version"
    for (const m of fileContents.matchAll(KTS_DEP_STRING_COORDS_REGEX)) {
      const [, , group, artifact, version] = m;
      deps.push(depEntry(`${group}:${artifact}`, version));
    }

    // platform("group:artifact:version")
    for (const m of fileContents.matchAll(KTS_DEP_PLATFORM_REGEX)) {
      const [, , group, artifact, version] = m;
      // Record as regular coord (you may prefer to tag as BoM separately)
      deps.push(depEntry(`${group}:${artifact}`, version));
    }

    // libs aliases (version catalogs) — keep alias as name, unknown version
    for (const m of fileContents.matchAll(KTS_DEP_LIBS_ALIAS_REGEX)) {
      // Grab the exact token as name (best-effort)
      const token = m[0]
        .replace(/^[^(]+\(\s*/, '')
        .replace(/\)\s*$/, '')
        .trim(); // e.g., libs.androidx.appcompat or libs["androidx-core-ktx"]
      deps.push(depEntry(token));
    }

    // ---------- plugins ----------
    const plugins: Array<DepInput> = [];

    for (const m of fileContents.matchAll(KTS_PLUGIN_ID_REGEX)) {
      const [, pid, pver] = m;
      plugins.push(depEntry(pid, pver));
    }

    for (const m of fileContents.matchAll(KTS_PLUGIN_APPLY_REGEX)) {
      const [, pid] = m;
      plugins.push(depEntry(pid));
    }

    // alias(libs.plugins...) — keep alias token (no version)
    if (KTS_PLUGIN_ALIAS_REGEX.test(fileContents)) {
      // Collect all alias lines to preserve identifiers; light parse:
      const aliasMatches = fileContents.matchAll(
        /alias\s*\(\s*(libs(?:\.plugins)?(?:\.[\w\-.]+|\[["'][^"']+["']\]))\s*\)/g,
      );
      for (const m of aliasMatches) {
        plugins.push(depEntry(m[1]));
      }
    }

    // ---------- compose final list ----------
    // Merge deps + plugins as "softwareDevelopmentKits"
    const softwareDevelopmentKits = [...deps, ...plugins]
      // de-dup by name+version
      .reduce(
        (acc, cur) => {
          const key = `${cur.name}@@${cur.version || ''}`;
          if (!acc.map.has(key)) {
            acc.map.set(key, cur);
            acc.list.push(cur);
          }
          return acc;
        },
        {
          map: new Map<string, DepInput>(),
          list: [] as Array<DepInput>,
        },
      ).list;

    return [
      {
        name: appName,
        softwareDevelopmentKits,
      },
    ];
  },
};
