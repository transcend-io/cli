import { decodeCodec } from '@transcend-io/type-utils';
import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
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

/**
 * Write a Transcend configuration to disk
 *
 * @param filePath - Path to yaml file
 * @param input - The input to write out
 */
export function writeTranscendYaml(
  filePath: string,
  input: TranscendInput,
): void {
  writeFileSync(filePath, yaml.dump(decodeCodec(TranscendInput, input)));
}
