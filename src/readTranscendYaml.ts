import { decodeCodec } from '@transcend-io/type-utils';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { TranscendInput } from './codecs';

/**
 * Read in the contents of a yaml file and validate that the shape
 * of the yaml file matches the codec API
 *
 * @param filePath - Path to yaml file
 * @returns The contents of the yaml file, type-checked
 */
export function readTranscendYaml(filePath: string): TranscendInput {
  return decodeCodec(
    TranscendInput,
    yaml.load(readFileSync(filePath, 'utf-8')),
  );
}
