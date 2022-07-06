export interface SiloDiscoveryRawResults {
  /** The name of the potential data silo entry */
  name: string;
  /** A unique UUID (represents the same resource across different silo discovery runs) */
  resourceId: string;
  /** Any hosts associated with the entry */
  host?: string;
}

export interface SiloDiscoveryConfig {
  /** */
  ignoreDirs: string;
  /** */
  supportedFiles: string;
  /** */
  scanFunction: SiloDiscoveryFunction;
}

/**
 * The silo discovery function interface
 */
export type SiloDiscoveryFunction = (
  filePath: string,
) => Promise<SiloDiscoveryRawResults[]>;
