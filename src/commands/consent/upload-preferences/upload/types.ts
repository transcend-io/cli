export interface PreferenceUploadProgress {
  /** how many records just succeeded */
  successDelta: number;
  /** cumulative successes in this file */
  successTotal: number;
  /** total records that will be uploaded in this file */
  fileTotal: number;
}
