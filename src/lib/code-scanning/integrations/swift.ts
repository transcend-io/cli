import { readFileSync } from 'node:fs';
import { CodeScanningConfig } from '../types';
import { CodePackageType } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import * as t from 'io-ts';
import { dirname } from 'node:path';

const SwiftPackage = t.type({
  pins: t.array(
    t.type({
      identity: t.string,
      kind: t.string,
      location: t.string,
      state: t.intersection([
        t.type({
          revision: t.string,
        }),
        t.partial({
          version: t.union([t.string, t.undefined, t.null]),
        }),
      ]),
    }),
  ),
  version: t.number,
});

const SwiftPackageV1 = t.type({
  object: t.type({
    pins: t.array(
      t.type({
        package: t.string,
        repositoryURL: t.string,
        state: t.intersection([
          t.type({
            branch: t.union([t.string, t.undefined, t.null]),
            revision: t.string,
          }),
          t.partial({
            version: t.union([t.string, t.undefined, t.null]),
          }),
        ]),
      }),
    ),
  }),
  version: t.number,
});

export const swift: CodeScanningConfig = {
  supportedFiles: ['Package.resolved'],
  ignoreDirs: [],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, 'utf-8');

    // Attempt latest version first
    try {
      const parsed = decodeCodec(SwiftPackage, fileContents);
      const splitPath = dirname(filePath).split('/');
      const originalName = splitPath[splitPath.length - 1];
      let name = originalName;
      if (name === 'swiftpm') {
        name = splitPath[splitPath.length - 2];
        if (name === 'xcshareddata') {
          name = splitPath[splitPath.length - 3];
        } else if (!name) {
          name = originalName;
        }
        if (name === 'project.xcworkspace') {
          name = splitPath[splitPath.length - 4];
        }
      }
      return [
        {
          name,
          type: CodePackageType.Swift,
          softwareDevelopmentKits: parsed.pins.map((target) => ({
            name: target.identity,
            version: target.state.version || undefined,
          })),
        },
      ];
    } catch (e) {
      // Throw non codec errors
      if (!e?.message?.includes('Failed to decode codec')) {
        throw e;
      }

      // Attempt v1
      try {
        const parsed = decodeCodec(SwiftPackageV1, fileContents);
        return [
          {
            name: dirname(filePath).split('/').pop() || '', // TODO pull from Package.swift ->> name if possible
            type: CodePackageType.Swift,
            softwareDevelopmentKits: parsed.object.pins.map((target) => ({
              name: target.package,
              version: target.state.version || undefined,
            })),
          },
        ];
      } catch (e2) {
        if (!e2?.message?.includes('Failed to decode codec')) {
          throw e2;
        }
        throw e;
      }
    }
  },
};
