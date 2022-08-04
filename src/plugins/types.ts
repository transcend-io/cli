export interface SiloDiscoveryRawResults {
  /** The name of the potential data silo entry */
  name: string;
  /** A unique UUID (represents the same resource across different silo discovery runs) */
  resourceId: string;
  /** Any hosts associated with the entry */
  host?: string;
  /** Type of data silo */
  type?: string | undefined;
}

export interface SiloDiscoveryConfig {
  /** Directories to ignore when traversing */
  ignoreDirs: string[];
  /** Types of file that are supported */
  supportedFiles: string[];
  /** Scanning file depends on their type */
  scanFunction: SiloDiscoveryFunction;
}

export interface SiloDiscoveryRawInput {
  /** name of dependency */
  name: string;
  /** type of dependency, if applicable */
  type: string | undefined;
}

/**
 * The silo discovery function interface
 */
export type SiloDiscoveryFunction = (
  filePath: string,
) => SiloDiscoveryRawInput[];
