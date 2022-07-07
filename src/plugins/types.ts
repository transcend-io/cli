export interface SiloDiscoveryRawResults {
  /** The name of the potential data silo entry */
  name: string;
  /** A unique UUID (represents the same resource across different silo discovery runs) */
  resourceId: string;
  /** Any hosts associated with the entry */
  host?: string;
}

export interface SiloDiscoveryConfig {
  /** Directories to ignore when traversing */
  ignoreDirs: string[];
  /** Types of file that are supported */
  supportedFiles: string[];
  /** Scanning file depends on their type */
  scanFunction: SiloDiscoveryFunction;
}

/**
 * The silo discovery function interface
 */
export type SiloDiscoveryFunction = (filePath: string) => string[];
