import { readFileSync } from 'fs';
import { CodeScanningConfig } from '../types';
import { CodePackageType } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import * as t from 'io-ts';
import { dirname } from 'path';

const SwiftPackage = t.type({
  pins: t.array(
    t.type({
      identity: t.string,
      kind: t.string,
      location: t.string,
      state: t.type({
        revision: t.string,
        version: t.string,
      }),
    }),
  ),
  version: t.number,
});

export const swift: CodeScanningConfig = {
  supportedFiles: ['Package.resolved'],
  ignoreDirs: [],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, 'utf-8');

    const parsed = decodeCodec(SwiftPackage, fileContents);

    return [
      {
        name: dirname(filePath).split('/').pop() || '', // FIXME pull from Package.swift ->> name if possible
        type: CodePackageType.CocoaPods, // FIXME should be swift
        softwareDevelopmentKits: parsed.pins.map((target) => ({
          name: target.identity,
          version: target.state.version,
        })),
      },
    ];
  },
};
