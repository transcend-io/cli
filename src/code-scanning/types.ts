import { CodePackageInput } from '../codecs';

export interface CodeScanningConfig {
  /** Directories to ignore when traversing */
  ignoreDirs: string[];
  /** Types of file that are supported */
  supportedFiles: string[];
  /** The function that will parse in a code package configuration given an input file */
  scanFunction: (
    filePath: string,
  ) => Omit<CodePackageInput, 'repositoryName' | 'relativePath' | 'type'>[];
}
