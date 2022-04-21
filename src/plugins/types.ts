export interface SiloDiscoveryRawResults {
  /** The name of the potential data silo entry */
  name: string;
  /** A unique UUID (represents the same resource across different silo discovery runs) */
  resourceId: string;
  /** Any hosts associated with the entry */
  host?: string;
}

/**
 * The silo discovery function interface
 */
export type SiloDiscoveryFunction = (
  scanPath: string,
  ignoreDirs: string,
) => Promise<SiloDiscoveryRawResults[]>;
